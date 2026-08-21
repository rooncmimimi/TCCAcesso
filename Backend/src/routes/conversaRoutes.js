import { Router } from "express";
import ConversaController from "../controllers/ConversaController.js";
import MensagemController from "../controllers/MensagemController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarAberturaConversa,
    validarEnvioMensagem
} from "../validators/conversaValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", ConversaController.index);

router.post(
    "/",
    validarAberturaConversa,
    validationMiddleware,
    ConversaController.store
);

router.get("/nao-lidas", ConversaController.naoLidas);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    ConversaController.show
);

router.get(
    "/:conversaId/mensagens",
    validarUuidParam("conversaId"),
    validationMiddleware,
    MensagemController.index
);

router.post(
    "/:conversaId/mensagens",
    validarEnvioMensagem,
    validationMiddleware,
    MensagemController.store
);

router.patch(
    "/:conversaId/mensagens/lidas",
    validarUuidParam("conversaId"),
    validationMiddleware,
    MensagemController.marcarComoLidas
);

export default router;
