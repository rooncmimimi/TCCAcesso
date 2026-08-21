import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
import AutenticacaoDoisFatoresController from "../controllers/AutenticacaoDoisFatoresController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { authLimiter, refreshLimiter } from "../middlewares/rateLimitMiddleware.js";
import {
    validarCadastroCandidato,
    validarCadastroEmpresa,
    validarLogin,
    validarTrocaSenha
} from "../validators/authValidator.js";
import {
    validarRefresh,
    validarEsqueciSenha,
    validarRedefinirSenha,
    validarSenhaAtual2FA,
    validarCodigo2FA,
    validarSolicitarTrocaEmail
} from "../validators/sessaoValidator.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.post(
    "/register/candidato",
    authLimiter,
    validarCadastroCandidato,
    validationMiddleware,
    AuthController.registerCandidate
);

router.post(
    "/register/empresa",
    authLimiter,
    validarCadastroEmpresa,
    validationMiddleware,
    AuthController.registerCompany
);

router.post(
    "/login",
    authLimiter,
    validarLogin,
    validationMiddleware,
    AuthController.login
);

router.post(
    "/refresh",
    refreshLimiter,
    validarRefresh,
    validationMiddleware,
    AuthController.refresh
);

router.post(
    "/senha/esqueci",
    authLimiter,
    validarEsqueciSenha,
    validationMiddleware,
    AuthController.esqueciSenha
);

router.post(
    "/senha/redefinir",
    authLimiter,
    validarRedefinirSenha,
    validationMiddleware,
    AuthController.redefinirSenha
);

router.get("/me", authMiddleware, AuthController.me);

router.patch(
    "/senha",
    authMiddleware,
    validarTrocaSenha,
    validationMiddleware,
    AuthController.alterarSenha
);

router.post("/logout", authMiddleware, AuthController.logout);

/* ---------- Autenticação de dois fatores (2FA) ---------- */

router.get(
    "/2fa/status",
    authMiddleware,
    AutenticacaoDoisFatoresController.status
);

router.post(
    "/2fa/iniciar",
    authMiddleware,
    authLimiter,
    validarSenhaAtual2FA,
    validationMiddleware,
    AutenticacaoDoisFatoresController.iniciar
);

router.post(
    "/2fa/confirmar",
    authMiddleware,
    authLimiter,
    validarCodigo2FA,
    validationMiddleware,
    AutenticacaoDoisFatoresController.confirmar
);

router.post(
    "/2fa/desativar",
    authMiddleware,
    authLimiter,
    validarSenhaAtual2FA,
    validationMiddleware,
    AutenticacaoDoisFatoresController.desativar
);

/* ---------- Conta (pausar / excluir / trocar e-mail) ---------- */

router.post(
    "/conta/pausar",
    authMiddleware,
    authLimiter,
    validarSenhaAtual2FA,
    validationMiddleware,
    AuthController.pausarConta
);

router.delete(
    "/conta",
    authMiddleware,
    authLimiter,
    validarSenhaAtual2FA,
    validationMiddleware,
    AuthController.excluirConta
);

router.post(
    "/email/solicitar",
    authMiddleware,
    authLimiter,
    validarSolicitarTrocaEmail,
    validationMiddleware,
    AuthController.solicitarTrocaEmail
);

router.post(
    "/email/confirmar",
    authMiddleware,
    authLimiter,
    validarCodigo2FA,
    validationMiddleware,
    AuthController.confirmarTrocaEmail
);

/* ---------- Sessões ativas ---------- */

router.post("/sessoes", authMiddleware, AuthController.sessoes);

router.delete(
    "/sessoes/:id",
    authMiddleware,
    validarUuidParam("id"),
    validationMiddleware,
    AuthController.revogarSessao
);

router.post(
    "/sessoes/encerrar-outras",
    authMiddleware,
    AuthController.revogarOutrasSessoes
);

export default router;
