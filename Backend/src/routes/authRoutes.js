import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
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
    validarRedefinirSenha
} from "../validators/sessaoValidator.js";

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

export default router;
