import { Router } from "express";

import SeguidorController from "../controllers/SeguidorController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/sugestoes", SeguidorController.sugestoes);
router.get("/sugestoes/empresas", SeguidorController.sugestoesEmpresas);

router.post(
    "/usuarios/:usuarioId",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    SeguidorController.seguirUsuario
);

router.post(
    "/empresas/:empresaId",
    validarUuidParam("empresaId"),
    validationMiddleware,
    SeguidorController.seguirEmpresa
);

router.get(
    "/seguidores/:usuarioId",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    SeguidorController.seguidores
);

router.get(
    "/seguindo/:usuarioId",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    SeguidorController.seguindo
);

router.get(
    "/resumo/:usuarioId",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    SeguidorController.resumo
);

router.get(
    "/resumo/empresas/:empresaId",
    validarUuidParam("empresaId"),
    validationMiddleware,
    SeguidorController.resumoEmpresa
);

/* ---------- Solicitações de seguimento (perfil privado) — Fase 3 ---------- */

router.post(
    "/solicitacoes/:destinatarioId",
    validarUuidParam("destinatarioId"),
    validationMiddleware,
    SeguidorController.solicitarSeguir
);

router.delete(
    "/solicitacoes/:destinatarioId",
    validarUuidParam("destinatarioId"),
    validationMiddleware,
    SeguidorController.cancelarSolicitacao
);

router.post(
    "/solicitacoes/:solicitacaoId/aceitar",
    validarUuidParam("solicitacaoId"),
    validationMiddleware,
    SeguidorController.aceitarSolicitacao
);

router.post(
    "/solicitacoes/:solicitacaoId/recusar",
    validarUuidParam("solicitacaoId"),
    validationMiddleware,
    SeguidorController.recusarSolicitacao
);

export default router;
