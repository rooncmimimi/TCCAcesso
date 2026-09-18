import { Router } from "express";
import CandidaturaController from "../controllers/CandidaturaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import { validarStatusCandidatura } from "../validators/candidaturaValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get(
    "/minhas",
    exigirTipoUsuarioMiddleware("candidato"),
    CandidaturaController.minhas
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidaturaController.obter
);

router.patch(
    "/:id/status",
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    validarStatusCandidatura,
    validacaoMiddleware,
    CandidaturaController.atualizarStatus
);

router.patch(
    "/:id/cancelar",
    exigirTipoUsuarioMiddleware("candidato", "administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidaturaController.cancelar
);

export default router;
