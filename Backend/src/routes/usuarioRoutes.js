import { Router } from "express";
import UsuarioController from "../controllers/UsuarioController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
    validarAtualizacaoUsuario,
    validarUuidParam
} from "../validators/usuarioValidator.js";

const router = Router();

// Todas as rotas de usuário exigem autenticação.
router.use(authMiddleware);

router.get(
    "/",
    rbacMiddleware("administrador"),
    UsuarioController.index
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.show
);

// Dono do recurso ou administrador (verificado no Service).
router.put(
    "/:id",
    validarAtualizacaoUsuario,
    validationMiddleware,
    UsuarioController.update
);

router.patch(
    "/:id/foto",
    validarUuidParam("id"),
    validationMiddleware,
    upload.single("foto"),
    UsuarioController.updateFoto
);

router.patch(
    "/:id/ativar",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.activate
);

router.patch(
    "/:id/desativar",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.deactivate
);

router.delete(
    "/:id",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.destroy
);

export default router;
