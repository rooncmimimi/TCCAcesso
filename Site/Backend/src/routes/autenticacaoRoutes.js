import { Router } from "express";
import AutenticacaoController from "../controllers/AutenticacaoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
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

router.get("/me", autenticacaoMiddleware, AutenticacaoController.perfilAtual);

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
