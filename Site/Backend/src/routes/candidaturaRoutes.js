import { Router } from "express";
import CandidaturaController from "../controllers/CandidaturaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import { validarStatusCandidatura } from "../validators/candidaturaValidator.js";

const router = Router();

router.use(authMiddleware);

router.get(
    "/minhas",
    rbacMiddleware("candidato"),
    CandidaturaController.minhas
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    CandidaturaController.show
);

router.patch(
    "/:id/status",
    rbacMiddleware("empresa", "administrador"),
    validarStatusCandidatura,
    validationMiddleware,
    CandidaturaController.atualizarStatus
);

router.patch(
    "/:id/cancelar",
    rbacMiddleware("candidato", "administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    CandidaturaController.cancelar
);

export default router;
