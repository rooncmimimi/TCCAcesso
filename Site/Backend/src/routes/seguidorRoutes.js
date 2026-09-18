import { Router } from "express";

import SeguidorController from "../controllers/SeguidorController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get("/sugestoes", SeguidorController.sugestoes);
router.get("/sugestoes/empresas", SeguidorController.sugestoesEmpresas);

router.post(
    "/usuarios/:usuarioId",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    SeguidorController.seguirUsuario
);

router.post(
    "/empresas/:empresaId",
    validarUuidParam("empresaId"),
    validacaoMiddleware,
    SeguidorController.seguirEmpresa
);

router.get(
    "/seguidores/:usuarioId",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    SeguidorController.seguidores
);

router.get(
    "/seguindo/:usuarioId",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    SeguidorController.seguindo
);

router.get(
    "/resumo/:usuarioId",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    SeguidorController.resumo
);

router.get(
    "/resumo/empresas/:empresaId",
    validarUuidParam("empresaId"),
    validacaoMiddleware,
    SeguidorController.resumoEmpresa
);

/* Solicitações de seguir (perfil privado) */

router.post(
    "/solicitacoes/:destinatarioId",
    validarUuidParam("destinatarioId"),
    validacaoMiddleware,
    SeguidorController.solicitarSeguir
);

router.delete(
    "/solicitacoes/:destinatarioId",
    validarUuidParam("destinatarioId"),
    validacaoMiddleware,
    SeguidorController.cancelarSolicitacao
);

router.post(
    "/solicitacoes/:solicitacaoId/aceitar",
    validarUuidParam("solicitacaoId"),
    validacaoMiddleware,
    SeguidorController.aceitarSolicitacao
);

router.post(
    "/solicitacoes/:solicitacaoId/recusar",
    validarUuidParam("solicitacaoId"),
    validacaoMiddleware,
    SeguidorController.recusarSolicitacao
);

export default router;
