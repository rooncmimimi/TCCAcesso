import { Router } from "express";
import ComentarioController from "../controllers/ComentarioController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";

const router = Router();

router.use(authMiddleware);

// Remoção de comentário (autor ou administrador — verificado no Service).
router.delete(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    ComentarioController.destroy
);

export default router;
