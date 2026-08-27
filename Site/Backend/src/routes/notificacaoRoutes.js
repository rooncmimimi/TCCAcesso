import { Router } from "express";
import NotificacaoController from "../controllers/NotificacaoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import { validarPreferenciasNotificacao } from "../validators/notificacaoValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", NotificacaoController.index);
router.get("/nao-lidas", NotificacaoController.naoLidas);
router.patch("/lidas", NotificacaoController.marcarTodas);

router.get("/preferencias", NotificacaoController.obterPreferencias);
router.put(
    "/preferencias",
    validarPreferenciasNotificacao,
    validationMiddleware,
    NotificacaoController.atualizarPreferencias
);

router.patch(
    "/:id/lida",
    validarUuidParam("id"),
    validationMiddleware,
    NotificacaoController.marcarComoLida
);

router.delete(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    NotificacaoController.destroy
);

export default router;
