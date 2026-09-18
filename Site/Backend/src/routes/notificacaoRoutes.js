import { Router } from "express";
import NotificacaoController from "../controllers/NotificacaoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarPreferenciasNotificacao,
    validarRegistroPushToken,
    validarRemocaoPushToken
} from "../validators/notificacaoValidator.js";

const router = Router();

router.use(autenticacaoMiddleware);

router.get("/", NotificacaoController.listar);
router.get("/nao-lidas", NotificacaoController.naoLidas);
router.patch("/lidas", NotificacaoController.marcarTodas);

router.get("/preferencias", NotificacaoController.obterPreferencias);
router.put(
    "/preferencias",
    validarPreferenciasNotificacao,
    validacaoMiddleware,
    NotificacaoController.atualizarPreferencias
);

// Push tokens. Rotas com caminho fixo ficam antes de `/:id`, senão `validarUuidParam("id")`
// recusaria "push-token" como UUID inválido.
router.post(
    "/push-token",
    validarRegistroPushToken,
    validacaoMiddleware,
    NotificacaoController.registrarPushToken
);
router.delete(
    "/push-token",
    validarRemocaoPushToken,
    validacaoMiddleware,
    NotificacaoController.removerPushToken
);

router.patch(
    "/:id/lida",
    validarUuidParam("id"),
    validacaoMiddleware,
    NotificacaoController.marcarComoLida
);

router.delete(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    NotificacaoController.excluir
);

export default router;
