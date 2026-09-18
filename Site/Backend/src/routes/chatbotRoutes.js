import { Router } from "express";
import { body, param } from "express-validator";
import ChatbotController from "../controllers/ChatbotController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get("/conversas", ChatbotController.listar);

router.get(
    "/conversas/:conversaId/mensagens",
    param("conversaId").isUUID().withMessage("Conversa inválida."),
    validacaoMiddleware,
    ChatbotController.mensagens
);

router.post(
    "/mensagens",
    body("conversaId")
        .optional({ nullable: true })
        .isUUID()
        .withMessage("Conversa inválida."),
    body("conteudo")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("A mensagem deve ter entre 1 e 1000 caracteres."),
    validacaoMiddleware,
    ChatbotController.criar
);

router.delete(
    "/conversas/:conversaId",
    param("conversaId").isUUID().withMessage("Conversa inválida."),
    validacaoMiddleware,
    ChatbotController.excluir
);

export default router;
