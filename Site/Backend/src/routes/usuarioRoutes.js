import { Router } from "express";
import UsuarioController from "../controllers/UsuarioController.js";
import BloqueioController from "../controllers/BloqueioController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
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

// Foto e capa vão para `perfis/<usuarioId>/<uuid>.ext`: o `:id` da rota é o próprio `usuarioId`, e
// `garantirDonoDeUsuario` confere se é o dono ou um administrador antes do upload.
const processarFotoCapa = criarProcessadorArmazenamento({
    pasta: (req) => `perfis/${req.params.id}`
});

// Todas as rotas de usuário exigem autenticação.
router.use(autenticacaoMiddleware);

router.get(
    "/",
    exigirTipoUsuarioMiddleware("administrador"),
    UsuarioController.listar
);

/* Bloqueio e privacidade (rotas fixas, antes de "/:id") */

router.get("/bloqueados", BloqueioController.listar);

router.put(
    "/privacidade",
    validarPrivacidade,
    validacaoMiddleware,
    BloqueioController.atualizarPrivacidade
);

router.put(
    "/privacidade/mensagens",
    validarPreferenciaMensagens,
    validacaoMiddleware,
    BloqueioController.atualizarPreferenciaMensagens
);

router.post(
    "/:usuarioId/bloquear",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    BloqueioController.bloquear
);

router.delete(
    "/:usuarioId/bloquear",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    BloqueioController.desbloquear
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    UsuarioController.obter
);

// Dono do recurso ou administrador (verificado no Service).
router.put(
    "/:id",
    validarAtualizacaoUsuario,
    validacaoMiddleware,
    UsuarioController.atualizar
);

router.patch(
    "/:id/foto",
    validarUuidParam("id"),
    validacaoMiddleware,
    garantirDonoDeUsuario,
    upload.single("foto"),
    processarFotoCapa,
    UsuarioController.atualizarFoto
);

router.patch(
    "/:id/capa",
    validarUuidParam("id"),
    validacaoMiddleware,
    garantirDonoDeUsuario,
    upload.single("capa"),
    processarFotoCapa,
    UsuarioController.atualizarCapa
);

router.patch(
    "/:id/ativar",
    exigirTipoUsuarioMiddleware("administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    UsuarioController.ativar
);

router.patch(
    "/:id/desativar",
    exigirTipoUsuarioMiddleware("administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    UsuarioController.desativar
);

router.delete(
    "/:id",
    exigirTipoUsuarioMiddleware("administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    UsuarioController.excluir
);

export default router;
