import { Router } from "express";
import AuthController from "../controllers/AuthController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";
import {
    validarCadastroCandidato,
    validarCadastroEmpresa,
    validarLogin,
    validarTrocaSenha
} from "../validators/authValidator.js";

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
