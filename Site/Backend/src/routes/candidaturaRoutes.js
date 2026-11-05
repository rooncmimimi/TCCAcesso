import { Router } from "express";
import CandidaturaController from "../controllers/CandidaturaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarEdicaoDeAdaptacoes,
    validarRespostaDeAdaptacao,
    validarStatusCandidatura
} from "../validators/candidaturaValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get(
    "/minhas",
    exigirTipoUsuarioMiddleware("candidato"),
    CandidaturaController.minhas
);

// Antes de `/:id`, para "rascunhos" não ser lido como um identificador.
router.get(
    "/rascunhos",
    exigirTipoUsuarioMiddleware("candidato"),
    CandidaturaController.meusRascunhos
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidaturaController.obter
);

/* Adaptações autorizadas: só a pessoa dona edita ou retira; só a empresa dona da vaga responde */
router.put(
    "/:id/adaptacoes",
    exigirTipoUsuarioMiddleware("candidato"),
    validarEdicaoDeAdaptacoes,
    validacaoMiddleware,
    CandidaturaController.editarAdaptacoes
);

router.delete(
    "/:id/adaptacoes",
    exigirTipoUsuarioMiddleware("candidato"),
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidaturaController.retirarAdaptacoes
);

router.post(
    "/:id/adaptacoes/resposta",
    exigirTipoUsuarioMiddleware("empresa"),
    validarRespostaDeAdaptacao,
    validacaoMiddleware,
    CandidaturaController.responderAdaptacoes
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
