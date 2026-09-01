import { Router } from "express";
import VagaController from "../controllers/VagaController.js";
import CandidaturaController from "../controllers/CandidaturaController.js";
import InteracaoController from "../controllers/InteracaoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import authOpcionalMiddleware from "../middlewares/authOpcionalMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarCriacaoVaga,
    validarAtualizacaoVaga,
    validarStatusVaga
} from "../validators/vagaValidator.js";
import { validarCriacaoCandidatura } from "../validators/candidaturaValidator.js";

const router = Router();

/* ---------- Público ---------- */
router.get("/", VagaController.index);

/* ---------- Empresa autenticada ---------- */
router.get(
    "/minhas",
    authMiddleware,
    rbacMiddleware("empresa"),
    VagaController.minhas
);

router.get(
    "/:id",
    authOpcionalMiddleware,
    validarUuidParam("id"),
    validationMiddleware,
    VagaController.show
);

router.post(
    "/",
    authMiddleware,
    rbacMiddleware("empresa"),
    validarCriacaoVaga,
    validationMiddleware,
    VagaController.store
);

router.put(
    "/:id",
    authMiddleware,
    rbacMiddleware("empresa", "administrador"),
    validarAtualizacaoVaga,
    validationMiddleware,
    VagaController.update
);

router.patch(
    "/:id/status",
    authMiddleware,
    rbacMiddleware("empresa", "administrador"),
    validarStatusVaga,
    validationMiddleware,
    VagaController.alterarStatus
);

router.get(
    "/:id/estatisticas",
    authMiddleware,
    rbacMiddleware("empresa", "administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    VagaController.estatisticas
);

router.delete(
    "/:id",
    authMiddleware,
    rbacMiddleware("empresa", "administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    VagaController.destroy
);

/* ---------- Candidaturas da vaga ---------- */
router.post(
    "/:vagaId/candidaturas",
    authMiddleware,
    rbacMiddleware("candidato"),
    validarCriacaoCandidatura,
    validationMiddleware,
    CandidaturaController.store
);

router.get(
    "/:vagaId/candidaturas",
    authMiddleware,
    rbacMiddleware("empresa", "administrador"),
    validarUuidParam("vagaId"),
    validationMiddleware,
    CandidaturaController.porVaga
);

/* ---------- Favoritar vaga ---------- */
router.post(
    "/:vagaId/favoritar",
    authMiddleware,
    rbacMiddleware("candidato"),
    validarUuidParam("vagaId"),
    validationMiddleware,
    InteracaoController.toggleFavorito
);

export default router;
