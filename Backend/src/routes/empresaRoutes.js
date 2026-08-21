import { Router } from "express";
import EmpresaController from "../controllers/EmpresaController.js";
import InteracaoController from "../controllers/InteracaoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import { validarAtualizacaoEmpresa } from "../validators/empresaValidator.js";

const router = Router();

/* ---------- Rotas públicas ---------- */
router.get("/", EmpresaController.index);
router.get("/parceiras", EmpresaController.partners);

router.get(
    "/usuario/:usuarioId",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    EmpresaController.porUsuario
);

/* ---------- Rotas autenticadas ---------- */
router.get("/me", authMiddleware, EmpresaController.me);

router.get(
    "/seguindo",
    authMiddleware,
    rbacMiddleware("candidato"),
    InteracaoController.listarSeguidas
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    EmpresaController.show
);

router.post(
    "/:empresaId/seguir",
    authMiddleware,
    rbacMiddleware("candidato"),
    validarUuidParam("empresaId"),
    validationMiddleware,
    InteracaoController.toggleSeguir
);

router.put(
    "/:id",
    authMiddleware,
    validarAtualizacaoEmpresa,
    validationMiddleware,
    EmpresaController.update
);

router.patch(
    "/:id/logo",
    authMiddleware,
    validarUuidParam("id"),
    validationMiddleware,
    upload.single("logo"),
    EmpresaController.uploadLogo
);

router.patch(
    "/:id/capa",
    authMiddleware,
    validarUuidParam("id"),
    validationMiddleware,
    upload.single("capa"),
    EmpresaController.uploadCapa
);

router.delete(
    "/:id",
    authMiddleware,
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    EmpresaController.destroy
);

export default router;
