import { Router } from "express";
import CandidatoController from "../controllers/CandidatoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarAtualizacaoCandidato,
    validarVinculoDeficiencia
} from "../validators/candidatoValidator.js";

const router = Router();

router.use(authMiddleware);

// Perfil do candidato autenticado.
router.get("/me", CandidatoController.me);

// Busca de talentos: empresas e administradores.
router.get(
    "/",
    rbacMiddleware("empresa", "administrador"),
    CandidatoController.index
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    CandidatoController.show
);

router.put(
    "/:id",
    validarAtualizacaoCandidato,
    validationMiddleware,
    CandidatoController.update
);

router.patch(
    "/:id/curriculo",
    validarUuidParam("id"),
    validationMiddleware,
    upload.single("curriculo"),
    CandidatoController.uploadCurriculo
);

router.post(
    "/:id/deficiencias",
    validarVinculoDeficiencia,
    validationMiddleware,
    CandidatoController.vincularDeficiencia
);

router.delete(
    "/:id/deficiencias/:deficienciaId",
    validarUuidParam("id"),
    validarUuidParam("deficienciaId"),
    validationMiddleware,
    CandidatoController.desvincularDeficiencia
);

router.delete(
    "/:id",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    CandidatoController.destroy
);

export default router;
