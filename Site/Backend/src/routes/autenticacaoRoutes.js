import { Router } from "express";
import AutenticacaoController from "../controllers/AutenticacaoController.js";
import GoogleAuthController from "../controllers/GoogleAuthController.js";
import autenticacaoMiddleware, { autenticacaoSemExigirMfa } from "../middlewares/autenticacaoMiddleware.js";
import TotpController from "../controllers/TotpController.js";
import SegurancaController from "../controllers/SegurancaController.js";
import autenticacaoOpcionalMiddleware from "../middlewares/autenticacaoOpcionalMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import {
    criarLimiteGoogle,
    limiteAutenticacao,
    limiteGoogleIniciar,
    limiteRenovacaoToken,
    limiteReenvioConfirmacao,
    limiteRecuperacaoSenha
} from "../middlewares/limiteRequisicoesMiddleware.js";
import {
    validarCadastroCandidato,
    validarCadastroComGoogle,
    validarCadastroEmpresa,
    validarLogin,
    validarTrocaSenha
} from "../validators/autenticacaoValidator.js";
import {
    validarRefresh,
    validarEsqueciSenha,
    validarRedefinirSenha,
    validarSenhaAtual,
    validarCodigoVerificacao,
    validarSolicitarTrocaEmail,
    validarConfirmarCadastro,
    validarReenviarConfirmacaoCadastro
} from "../validators/sessaoValidator.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarConfirmarContaComprometida,
    validarLoginDispositivo,
    validarProtegerAgora,
    validarReenvioDeCodigo,
    validarSolicitarContaComprometida
} from "../validators/segurancaValidator.js";
import {
    validarAtivarTotp,
    validarIniciarConfiguracaoTotp,
    validarLoginTotp,
    validarReautenticacaoTotp
} from "../validators/totpValidator.js";

const router = Router();

router.post(
    "/register/candidato",
    limiteAutenticacao,
    validarCadastroCandidato,
    validacaoMiddleware,
    AutenticacaoController.cadastrarCandidato
);

router.post(
    "/register/empresa",
    limiteAutenticacao,
    // Opcional no middleware, obrigatório no service: assim um token inválido vira erro claro de
    // autenticação em vez de passar como "sem sessão".
    autenticacaoOpcionalMiddleware,
    validarCadastroEmpresa,
    validacaoMiddleware,
    AutenticacaoController.cadastrarEmpresa
);

router.post(
    "/login",
    limiteAutenticacao,
    validarLogin,
    validacaoMiddleware,
    AutenticacaoController.entrar
);

// Passo 2 do login de quem tem verificação em duas etapas (senha ou Google já provados). Público: o
// desafio de 5 minutos é quem identifica a conta; o código errado conta no limite de falhas.
router.post(
    "/login/totp",
    limiteAutenticacao,
    validarLoginTotp,
    validacaoMiddleware,
    AutenticacaoController.entrarComSegundoFator
);

// Passo 2 do login em dispositivo novo: o código enviado por e-mail. Público: quem identifica a conta é o desafio.
router.post(
    "/login/dispositivo",
    limiteAutenticacao,
    validarLoginDispositivo,
    validacaoMiddleware,
    AutenticacaoController.entrarComDispositivo
);

router.post(
    "/login/dispositivo/reenviar",
    limiteReenvioConfirmacao,
    validarReenvioDeCodigo,
    validacaoMiddleware,
    AutenticacaoController.reenviarCodigoDispositivo
);

/* Segurança da conta: dispositivos de confiança, histórico e conta comprometida (Bloco 3) */

// Diz se o recurso está ligado; o Site só mostra as telas novas quando está.
router.get("/seguranca/disponivel", SegurancaController.disponivel);

router.get("/dispositivos", autenticacaoMiddleware, SegurancaController.dispositivos);
router.post("/dispositivos/revogar-todos", autenticacaoMiddleware, SegurancaController.revogarTodosDispositivos);
router.delete(
    "/dispositivos/:id",
    autenticacaoMiddleware,
    validarUuidParam("id"),
    validacaoMiddleware,
    SegurancaController.revogarDispositivo
);
router.get("/eventos-de-seguranca", autenticacaoMiddleware, SegurancaController.eventos);

// "Acho que invadiram minha conta": o pedido público (resposta sempre genérica), a confirmação pelo link do e-mail e a
// proteção de quem está logado. Nenhuma delas desliga a verificação em duas etapas.
router.post(
    "/conta-comprometida/solicitar",
    limiteRecuperacaoSenha,
    validarSolicitarContaComprometida,
    validacaoMiddleware,
    SegurancaController.solicitarContaComprometida
);
router.post(
    "/conta-comprometida/confirmar",
    limiteAutenticacao,
    validarConfirmarContaComprometida,
    validacaoMiddleware,
    SegurancaController.confirmarContaComprometida
);
router.post(
    "/conta-comprometida/proteger-agora",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarProtegerAgora,
    validacaoMiddleware,
    SegurancaController.protegerAgora
);

router.post(
    "/refresh",
    limiteRenovacaoToken,
    validarRefresh,
    validacaoMiddleware,
    AutenticacaoController.renovarToken
);

router.post(
    "/senha/esqueci",
    limiteRecuperacaoSenha,
    validarEsqueciSenha,
    validacaoMiddleware,
    AutenticacaoController.esqueciSenha
);

router.post(
    "/senha/redefinir",
    limiteAutenticacao,
    validarRedefinirSenha,
    validacaoMiddleware,
    AutenticacaoController.redefinirSenha
);

/* Confirmação de e-mail de cadastro (rotas públicas) */

router.post(
    "/cadastro/confirmar-email",
    limiteAutenticacao,
    validarConfirmarCadastro,
    validacaoMiddleware,
    AutenticacaoController.confirmarCadastro
);

router.post(
    "/cadastro/reenviar-confirmacao",
    limiteReenvioConfirmacao,
    validarReenviarConfirmacaoCadastro,
    validacaoMiddleware,
    AutenticacaoController.reenviarConfirmacaoCadastro
);

/* Entrar e cadastrar com Google (OAuth 2.0 / OpenID Connect) */

// Diz se o recurso está configurado; o Site só mostra o botão quando está.
router.get("/google/disponivel", GoogleAuthController.disponivel);

// Devolve a URL da tela de consentimento. Público: acontece antes de existir conta. Tem limite
// próprio (conta todas as requisições), além do de falhas. O próprio vem por último, para os
// cabeçalhos RateLimit-* das respostas de sucesso serem os dele.
router.get("/google/iniciar", limiteAutenticacao, limiteGoogleIniciar, GoogleAuthController.iniciar);

// Para onde o Google manda o navegador de volta. Sempre termina redirecionando ao Site, inclusive
// quando o limite é excedido.
router.get(
    "/google/callback",
    criarLimiteGoogle({ aoExceder: (req, res) => GoogleAuthController.limiteExcedido(req, res) }),
    GoogleAuthController.callback
);

// O Site troca o código de entrega por sessão, por conflito ou pelo próximo passo do cadastro.
router.post("/google/concluir", limiteAutenticacao, GoogleAuthController.concluir);

// Cria a conta direto do retorno do Google, sem senha (só com GOOGLE_CONTA_SEM_SENHA=true). Público:
// acontece antes de existir conta; o que vale vem da prova que o servidor assinou.
router.post(
    "/google/cadastrar",
    limiteAutenticacao,
    validarCadastroComGoogle,
    validacaoMiddleware,
    GoogleAuthController.cadastrar
);

/* Contas conectadas (Configurações → Segurança): vincular e desvincular o Google de quem já tem conta. */

// Situação do Google nesta conta: recurso disponível, conta elegível (candidato) e vinculada ou não.
router.get("/google/conta", autenticacaoMiddleware, GoogleAuthController.conta);

// Passo 1: confirma a senha e devolve a URL do Google. Exige sessão.
router.post(
    "/google/vincular/iniciar",
    autenticacaoMiddleware,
    limiteAutenticacao,
    GoogleAuthController.iniciarVinculo
);

// Passo 2: o código de volta do Google, só para a sessão que o pediu — único caminho de vínculo para
// conta que já existe.
router.post("/google/vincular", autenticacaoMiddleware, limiteAutenticacao, GoogleAuthController.vincular);

// Desvincula, também com a senha atual.
router.delete("/google/vinculo", autenticacaoMiddleware, limiteAutenticacao, GoogleAuthController.desvincular);

// /me e /logout ficam abertos ao administrador que ainda não ativou (ou não verificou) o TOTP: a tela de
// configuração precisa saber quem ele é e ele precisa conseguir sair. Todo o resto do servidor o recusa.
router.get("/me", autenticacaoSemExigirMfa, AutenticacaoController.perfilAtual);

// Marca o cadastro como terminado (última etapa do wizard). Enquanto não for chamada,
// `cadastroConcluidoEm` fica nula e o Site oferece retomar o cadastro depois do login.
router.post(
    "/cadastro/concluir",
    autenticacaoMiddleware,
    AutenticacaoController.concluirCadastro
);

router.patch(
    "/senha",
    autenticacaoMiddleware,
    validarTrocaSenha,
    validacaoMiddleware,
    AutenticacaoController.alterarSenha
);

router.post("/logout", autenticacaoSemExigirMfa, AutenticacaoController.sair);

/* Verificação em duas etapas (aplicativo autenticador) */

// Estado e configuração ficam abertos ao administrador que ainda vai configurar. Trocar o aparelho de quem
// já tem TOTP exige senha e um código (`TotpService.iniciarConfiguracao`), então uma sessão não verificada
// não consegue trocá-lo.
router.get("/totp", autenticacaoSemExigirMfa, TotpController.estado);

router.post(
    "/totp/configurar",
    autenticacaoSemExigirMfa,
    limiteAutenticacao,
    validarIniciarConfiguracaoTotp,
    validacaoMiddleware,
    TotpController.iniciar
);

router.post(
    "/totp/ativar",
    autenticacaoSemExigirMfa,
    limiteAutenticacao,
    validarAtivarTotp,
    validacaoMiddleware,
    TotpController.ativar
);

router.post(
    "/totp/codigos-recuperacao",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarReautenticacaoTotp,
    validacaoMiddleware,
    TotpController.regenerarCodigos
);

router.post(
    "/totp/desativar",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarReautenticacaoTotp,
    validacaoMiddleware,
    TotpController.desativar
);

/* Conta: pausar, excluir e trocar e-mail */

router.post(
    "/conta/pausar",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarSenhaAtual,
    validacaoMiddleware,
    AutenticacaoController.pausarConta
);

router.delete(
    "/conta",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarSenhaAtual,
    validacaoMiddleware,
    AutenticacaoController.excluirConta
);

router.post(
    "/email/solicitar",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarSolicitarTrocaEmail,
    validacaoMiddleware,
    AutenticacaoController.solicitarTrocaEmail
);

router.post(
    "/email/confirmar",
    autenticacaoMiddleware,
    limiteAutenticacao,
    validarCodigoVerificacao,
    validacaoMiddleware,
    AutenticacaoController.confirmarTrocaEmail
);

/* Sessões ativas */

router.post("/sessoes", autenticacaoMiddleware, AutenticacaoController.sessoes);

router.delete(
    "/sessoes/:id",
    autenticacaoMiddleware,
    validarUuidParam("id"),
    validacaoMiddleware,
    AutenticacaoController.revogarSessao
);

router.post(
    "/sessoes/encerrar-outras",
    autenticacaoMiddleware,
    AutenticacaoController.revogarOutrasSessoes
);

export default router;
