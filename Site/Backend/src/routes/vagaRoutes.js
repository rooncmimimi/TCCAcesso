import { Router } from "express";
import VagaController from "../controllers/VagaController.js";
import CandidaturaController from "../controllers/CandidaturaController.js";
import InteracaoController from "../controllers/InteracaoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import autenticacaoOpcionalMiddleware from "../middlewares/autenticacaoOpcionalMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarCriacaoVaga,
    validarAtualizacaoVaga,
    validarStatusVaga
} from "../validators/vagaValidator.js";
import { validarCriacaoCandidatura } from "../validators/candidaturaValidator.js";

const router = Router();

/* Público */
router.get("/", VagaController.listar);

/* Empresa autenticada */
router.get(
    "/minhas",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa"),
    VagaController.minhas
);

router.get(
    "/:id",
    autenticacaoOpcionalMiddleware,
    validarUuidParam("id"),
    validacaoMiddleware,
    VagaController.obter
);

router.post(
    "/",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa"),
    validarCriacaoVaga,
    validacaoMiddleware,
    VagaController.criar
);

router.put(
    "/:id",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    validarAtualizacaoVaga,
    validacaoMiddleware,
    VagaController.atualizar
);

router.patch(
    "/:id/status",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    validarStatusVaga,
    validacaoMiddleware,
    VagaController.alterarStatus
);

router.get(
    "/:id/estatisticas",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    VagaController.estatisticas
);

router.delete(
    "/:id",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    VagaController.excluir
);

/* Candidaturas da vaga */
router.post(
    "/:vagaId/candidaturas",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("candidato"),
    validarCriacaoCandidatura,
    validacaoMiddleware,
    CandidaturaController.criar
);

router.get(
    "/:vagaId/candidaturas",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    validarUuidParam("vagaId"),
    validacaoMiddleware,
    CandidaturaController.porVaga
);

/* Favoritar vaga */
router.post(
    "/:vagaId/favoritar",
    autenticacaoMiddleware,
    exigirTipoUsuarioMiddleware("candidato"),
    validarUuidParam("vagaId"),
    validacaoMiddleware,
    InteracaoController.alternarFavorito
);

export default router;
