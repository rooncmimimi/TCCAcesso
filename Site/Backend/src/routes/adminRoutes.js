import { Router } from "express";
import { body } from "express-validator";

import AdminController from "../controllers/AdminController.js";
import DenunciaController from "../controllers/DenunciaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarObservacaoAdmin,
    validarResolucaoDenuncia
} from "../validators/denunciaValidator.js";

const router = Router();

router.use(autenticacaoMiddleware, exigirTipoUsuarioMiddleware("administrador"));

router.get("/relatorios", AdminController.relatorios);

router.get("/empresas", AdminController.empresas);
router.post(
    "/empresas/:id/aprovar",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.aprovarEmpresa
);
router.post(
    "/empresas/:id/reprovar",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.reprovarEmpresa
);
router.post(
    "/empresas/:id/suspender",
    validarUuidParam("id"),
    // `motivo` vai para o e-mail e a notificação, então tem limite de tamanho, como
    // `validarObservacaoAdmin` nas denúncias.
    body("motivo").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Motivo deve ter no máximo 1000 caracteres."),
    validacaoMiddleware,
    AdminController.suspenderEmpresa
);
router.post(
    "/empresas/:id/reativar",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.reativarEmpresa
);
// Selo de confiança, independente da aprovação cadastral (ver AdminEmpresaService.verificarEmpresa).
router.post(
    "/empresas/:id/verificar",
    validarUuidParam("id"),
    body("verificada").isBoolean().withMessage("Informe verificada como true ou false."),
    validacaoMiddleware,
    AdminController.verificarEmpresa
);

router.get("/usuarios", AdminController.usuarios);
router.get(
    "/usuarios/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.usuario
);
router.post(
    "/usuarios/:id/bloquear",
    validarUuidParam("id"),
    body("bloqueado").optional().isBoolean().withMessage("Informe bloqueado como true ou false."),
    body("motivo").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Motivo deve ter no máximo 1000 caracteres."),
    validacaoMiddleware,
    AdminController.bloquearUsuario
);
router.delete(
    "/usuarios/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.removerUsuario
);

router.get("/postagens", AdminController.postagens);
router.delete(
    "/postagens/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.removerPostagem
);
router.get("/comentarios", AdminController.comentarios);
router.delete(
    "/comentarios/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.removerComentario
);

router.get("/vagas", AdminController.vagas);
router.post(
    "/vagas/:id/ocultar",
    validarUuidParam("id"),
    validacaoMiddleware,
    AdminController.ocultarVaga
);

router.get("/denuncias", DenunciaController.listar);
router.get(
    "/denuncias/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    DenunciaController.detalhe
);
router.get(
    "/denuncias/:id/contexto-mensagem",
    validarUuidParam("id"),
    validacaoMiddleware,
    DenunciaController.contextoMensagem
);
router.patch(
    "/denuncias/:id/atribuir",
    validarUuidParam("id"),
    validacaoMiddleware,
    DenunciaController.atribuir
);
router.patch(
    "/denuncias/:id/resolver",
    validarResolucaoDenuncia,
    validacaoMiddleware,
    DenunciaController.resolver
);
router.patch(
    "/denuncias/:id/rejeitar",
    validarObservacaoAdmin,
    validacaoMiddleware,
    DenunciaController.rejeitar
);
router.patch(
    "/denuncias/:id/arquivar",
    validarObservacaoAdmin,
    validacaoMiddleware,
    DenunciaController.arquivar
);

// Somente leitura: `registros_auditoria` continua imutável pela aplicação.
// Nenhum POST/PATCH/DELETE existe (nem deve existir) para este recurso.
router.get("/logs", AdminController.logs);

export default router;
