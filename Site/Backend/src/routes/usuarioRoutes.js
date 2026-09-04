import { Router } from "express";
import UsuarioController from "../controllers/UsuarioController.js";
import BloqueioController from "../controllers/BloqueioController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import upload, { criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";
import { garantirDonoDeUsuario } from "../middlewares/garantirDonoMiddleware.js";
import {
    validarAtualizacaoUsuario,
    validarUuidParam
} from "../validators/usuarioValidator.js";
import {
    validarPrivacidade,
    validarPreferenciaMensagens
} from "../validators/bloqueioValidator.js";

const router = Router();

// Foto/capa vão para `perfis/<usuarioId>/<uuid>.ext` — :id da rota é o
// próprio usuarioId (verificado como dono/admin antes pelo service).
const processarFotoCapa = criarProcessadorArmazenamento({
    pasta: (req) => `perfis/${req.params.id}`
});

// Todas as rotas de usuário exigem autenticação.
router.use(authMiddleware);

router.get(
    "/",
    rbacMiddleware("administrador"),
    UsuarioController.index
);

/* ---------- Bloqueio e privacidade (rotas fixas, antes de "/:id") ---------- */

router.get("/bloqueados", BloqueioController.listar);

router.put(
    "/privacidade",
    validarPrivacidade,
    validationMiddleware,
    BloqueioController.atualizarPrivacidade
);

router.put(
    "/privacidade/mensagens",
    validarPreferenciaMensagens,
    validationMiddleware,
    BloqueioController.atualizarPreferenciaMensagens
);

router.post(
    "/:usuarioId/bloquear",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    BloqueioController.bloquear
);

router.delete(
    "/:usuarioId/bloquear",
    validarUuidParam("usuarioId"),
    validationMiddleware,
    BloqueioController.desbloquear
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.show
);

// Dono do recurso ou administrador (verificado no Service).
router.put(
    "/:id",
    validarAtualizacaoUsuario,
    validationMiddleware,
    UsuarioController.update
);

router.patch(
    "/:id/foto",
    validarUuidParam("id"),
    validationMiddleware,
    garantirDonoDeUsuario,
    upload.single("foto"),
    processarFotoCapa,
    UsuarioController.updateFoto
);

router.patch(
    "/:id/capa",
    validarUuidParam("id"),
    validationMiddleware,
    garantirDonoDeUsuario,
    upload.single("capa"),
    processarFotoCapa,
    UsuarioController.updateCapa
);

router.patch(
    "/:id/ativar",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.activate
);

router.patch(
    "/:id/desativar",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.deactivate
);

router.delete(
    "/:id",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    UsuarioController.destroy
);

export default router;
