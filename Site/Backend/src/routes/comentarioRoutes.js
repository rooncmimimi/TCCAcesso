import { Router } from "express";
import ComentarioController from "../controllers/ComentarioController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

// Remoção de comentário (autor ou administrador, verificado no Service).
router.delete(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    ComentarioController.excluir
);

export default router;
