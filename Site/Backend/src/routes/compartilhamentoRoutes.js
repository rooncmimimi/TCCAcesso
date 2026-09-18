import { Router } from "express";
import CompartilhamentoController from "../controllers/CompartilhamentoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { body, param } from "express-validator";

const router = Router();

router.use(autenticacaoMiddleware);

router.get(
    "/usuario/:usuarioId",
    param("usuarioId").isUUID().withMessage("Usuário inválido."),
    validacaoMiddleware,
    CompartilhamentoController.porUsuario
);

router.get(
    "/postagem/:postagemId",
    param("postagemId").isUUID().withMessage("Postagem inválida."),
    validacaoMiddleware,
    CompartilhamentoController.listar
);

router.post(
    "/postagem/:postagemId",
    param("postagemId").isUUID().withMessage("Postagem inválida."),
    body("comentario")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage("O comentário deve ter no máximo 500 caracteres."),
    validacaoMiddleware,
    CompartilhamentoController.criar
);

router.delete(
    "/:id",
    param("id").isUUID().withMessage("Identificador inválido."),
    validacaoMiddleware,
    CompartilhamentoController.excluir
);

export default router;
