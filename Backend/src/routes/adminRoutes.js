import { Router } from "express";

import AdminController from "../controllers/AdminController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.use(authMiddleware, rbacMiddleware("administrador"));

router.get("/relatorios", AdminController.relatorios);

router.get("/empresas", AdminController.empresas);
router.post(
    "/empresas/:id/aprovar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.aprovarEmpresa
);
router.post(
    "/empresas/:id/reprovar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.reprovarEmpresa
);

router.get("/usuarios", AdminController.usuarios);
router.post(
    "/usuarios/:id/bloquear",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.bloquearUsuario
);
router.delete(
    "/usuarios/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.removerUsuario
);

router.get("/postagens", AdminController.postagens);
router.delete(
    "/postagens/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.removerPostagem
);
router.delete(
    "/comentarios/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.removerComentario
);

router.get("/vagas", AdminController.vagas);
router.post(
    "/vagas/:id/ocultar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.ocultarVaga
);

export default router;
