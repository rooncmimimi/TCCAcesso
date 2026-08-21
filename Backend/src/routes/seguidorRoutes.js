import { Router } from "express";

import SeguidorController from "../controllers/SeguidorController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/sugestoes", SeguidorController.sugestoes);

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

export default router;
