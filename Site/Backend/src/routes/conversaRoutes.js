import { Router } from "express";
import ConversaController from "../controllers/ConversaController.js";
import MensagemController from "../controllers/MensagemController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarAberturaConversa,
    validarEnvioMensagem
} from "../validators/conversaValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get("/", ConversaController.listar);

router.post(
    "/",
    validarAberturaConversa,
    validacaoMiddleware,
    ConversaController.criar
);

router.get("/nao-lidas", ConversaController.naoLidas);

router.get(
    "/pode-iniciar/:usuarioId",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    ConversaController.podeIniciar
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    ConversaController.obter
);

router.get(
    "/:conversaId/mensagens",
    validarUuidParam("conversaId"),
    validacaoMiddleware,
    MensagemController.listar
);

router.post(
    "/:conversaId/mensagens",
    validarEnvioMensagem,
    validacaoMiddleware,
    MensagemController.criar
);

router.patch(
    "/:conversaId/mensagens/lidas",
    validarUuidParam("conversaId"),
    validacaoMiddleware,
    MensagemController.marcarComoLidas
);

export default router;
