import { Router } from "express";
import PostagemController from "../controllers/PostagemController.js";
import ComentarioController from "../controllers/ComentarioController.js";
import CurtidaController from "../controllers/CurtidaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarCriacaoPostagem,
    validarAtualizacaoPostagem
} from "../validators/postagemValidator.js";
import { validarCriacaoComentario } from "../validators/comentarioValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", PostagemController.index);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    PostagemController.show
);

router.post(
    "/",
    upload.single("imagem"),
    validarCriacaoPostagem,
    validationMiddleware,
    PostagemController.store
);

router.put(
    "/:id",
    validarAtualizacaoPostagem,
    validationMiddleware,
    PostagemController.update
);

router.delete(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    PostagemController.destroy
);

/* ---------- Comentários ---------- */
router.get(
    "/:postagemId/comentarios",
    validarUuidParam("postagemId"),
    validationMiddleware,
    ComentarioController.index
);

router.post(
    "/:postagemId/comentarios",
    validarCriacaoComentario,
    validationMiddleware,
    ComentarioController.store
);

/* ---------- Curtidas ---------- */
router.get(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validationMiddleware,
    CurtidaController.index
);

router.post(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validationMiddleware,
    CurtidaController.toggle
);

export default router;
