import { Router } from "express";
import { body } from "express-validator";

import AdminController from "../controllers/AdminController.js";
import DenunciaController from "../controllers/DenunciaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarObservacaoAdmin,
    validarResolucaoDenuncia
} from "../validators/denunciaValidator.js";

const router = Router();

router.use(authMiddleware, rbacMiddleware("administrador"));

router.get("/relatorios", AdminController.relatorios);

router.get("/empresas", AdminController.empresas);
router.post(
    "/empresas/:id/aprovar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.aprovarEmpresa
);
router.post(
    "/empresas/:id/reprovar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.reprovarEmpresa
);
router.post(
    "/empresas/:id/suspender",
    validarUuidParam("id"),
    // Fase 9, Bloco 8: `motivo` (vai para e-mail + notificação) não tinha
    // nenhuma validação de tamanho/tipo — mesmo padrão já usado em
    // `validarObservacaoAdmin` (denúncias).
    body("motivo").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Motivo deve ter no máximo 1000 caracteres."),
    validationMiddleware,
    AdminController.suspenderEmpresa
);
router.post(
    "/empresas/:id/reativar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.reativarEmpresa
);
// Selo de confiança, independente da aprovação cadastral (ver AdminEmpresaService.verificarEmpresa).
router.post(
    "/empresas/:id/verificar",
    validarUuidParam("id"),
    body("verificada").isBoolean().withMessage("Informe verificada como true ou false."),
    validationMiddleware,
    AdminController.verificarEmpresa
);

router.get("/usuarios", AdminController.usuarios);
router.get(
    "/usuarios/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.usuario
);
router.post(
    "/usuarios/:id/bloquear",
    validarUuidParam("id"),
    body("bloqueado").optional().isBoolean().withMessage("Informe bloqueado como true ou false."),
    body("motivo").optional({ values: "falsy" }).trim().isLength({ max: 1000 }).withMessage("Motivo deve ter no máximo 1000 caracteres."),
    validationMiddleware,
    AdminController.bloquearUsuario
);
router.delete(
    "/usuarios/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.removerUsuario
);

router.get("/postagens", AdminController.postagens);
router.delete(
    "/postagens/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.removerPostagem
);
router.get("/comentarios", AdminController.comentarios);
router.delete(
    "/comentarios/:id",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.removerComentario
);

router.get("/vagas", AdminController.vagas);
router.post(
    "/vagas/:id/ocultar",
    validarUuidParam("id"),
    validationMiddleware,
    AdminController.ocultarVaga
);

router.get("/denuncias", DenunciaController.listar);
router.get(
    "/denuncias/:id",
    validarUuidParam("id"),
    validationMiddleware,
    DenunciaController.detalhe
);
router.get(
    "/denuncias/:id/contexto-mensagem",
    validarUuidParam("id"),
    validationMiddleware,
    DenunciaController.contextoMensagem
);
router.patch(
    "/denuncias/:id/atribuir",
    validarUuidParam("id"),
    validationMiddleware,
    DenunciaController.atribuir
);
router.patch(
    "/denuncias/:id/resolver",
    validarResolucaoDenuncia,
    validationMiddleware,
    DenunciaController.resolver
);
router.patch(
    "/denuncias/:id/rejeitar",
    validarObservacaoAdmin,
    validationMiddleware,
    DenunciaController.rejeitar
);
router.patch(
    "/denuncias/:id/arquivar",
    validarObservacaoAdmin,
    validationMiddleware,
    DenunciaController.arquivar
);

// Somente leitura — admin_audit_logs continua imutável pela aplicação.
// Nenhum POST/PATCH/DELETE existe (nem deve existir) para este recurso.
router.get("/logs", AdminController.logs);

export default router;
