import { Router } from "express";
import CompartilhamentoController from "../controllers/CompartilhamentoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { body, param } from "express-validator";

const router = Router();

router.use(authMiddleware);

router.get(
    "/usuario/:usuarioId",
    param("usuarioId").isUUID().withMessage("Usuário inválido."),
    validationMiddleware,
    CompartilhamentoController.porUsuario
);

router.get(
    "/postagem/:postagemId",
    param("postagemId").isUUID().withMessage("Postagem inválida."),
    validationMiddleware,
    CompartilhamentoController.index
);

router.post(
    "/postagem/:postagemId",
    param("postagemId").isUUID().withMessage("Postagem inválida."),
    body("comentario")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage("O comentário deve ter no máximo 500 caracteres."),
    validationMiddleware,
    CompartilhamentoController.store
);

router.delete(
    "/:id",
    param("id").isUUID().withMessage("Identificador inválido."),
    validationMiddleware,
    CompartilhamentoController.destroy
);

export default router;
