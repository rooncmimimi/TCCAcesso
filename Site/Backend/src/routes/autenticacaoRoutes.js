import { Router } from "express";
import AutenticacaoController from "../controllers/AutenticacaoController.js";
import GoogleAuthController from "../controllers/GoogleAuthController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import autenticacaoOpcionalMiddleware from "../middlewares/autenticacaoOpcionalMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import {
    limiteAutenticacao,
    limiteRenovacaoToken,
    limiteReenvioConfirmacao,
    limiteRecuperacaoSenha
} from "../middlewares/limiteRequisicoesMiddleware.js";
import {
    validarCadastroCandidato,
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

// Devolve a URL da tela de consentimento. Público: acontece antes de existir conta.
router.get("/google/iniciar", limiteAutenticacao, GoogleAuthController.iniciar);

// Para onde o Google manda o navegador de volta. Sempre termina redirecionando ao Site.
router.get("/google/callback", GoogleAuthController.callback);

// O Site troca o código de entrega por sessão, por conflito ou pelo próximo passo do cadastro.
router.post("/google/concluir", limiteAutenticacao, GoogleAuthController.concluir);

// Vincula a conta Google a quem já entrou com senha — único caminho de vínculo para conta que já
// existe, e por isso exige sessão.
router.post("/google/vincular", autenticacaoMiddleware, GoogleAuthController.vincular);

router.get("/me", autenticacaoMiddleware, AutenticacaoController.perfilAtual);

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

router.post("/logout", autenticacaoMiddleware, AutenticacaoController.sair);

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
