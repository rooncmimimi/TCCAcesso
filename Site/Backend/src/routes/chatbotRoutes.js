import { Router } from "express";
import { body, param } from "express-validator";
import ChatbotController from "../controllers/ChatbotController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/conversas", ChatbotController.index);

router.get(
    "/conversas/:conversaId/mensagens",
    param("conversaId").isUUID().withMessage("Conversa inválida."),
    validationMiddleware,
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
    validationMiddleware,
    ChatbotController.store
);

router.delete(
    "/conversas/:conversaId",
    param("conversaId").isUUID().withMessage("Conversa inválida."),
    validationMiddleware,
    ChatbotController.destroy
);

export default router;
