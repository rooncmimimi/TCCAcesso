import { Router } from "express";
import CandidatoController from "../controllers/CandidatoController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import rbacMiddleware from "../middlewares/rbacMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { uploadDocumento, criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarAtualizacaoCandidato,
    validarVinculoDeficiencia
} from "../validators/candidatoValidator.js";

const router = Router();

// Currículo (documento privado) vai para `curriculos/<candidatoId>/<uuid>.ext`
// no bucket PRIVADO — nunca resolvido para URL pública (ver Fase 4).
const processarCurriculo = criarProcessadorArmazenamento({
    pasta: (req) => `curriculos/${req.params.id}`,
    privado: true
});

router.use(authMiddleware);

// Perfil do candidato autenticado.
router.get("/me", CandidatoController.me);

// Busca de talentos: empresas e administradores.
router.get(
    "/",
    rbacMiddleware("empresa", "administrador"),
    CandidatoController.index
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    CandidatoController.show
);

router.put(
    "/:id",
    validarAtualizacaoCandidato,
    validationMiddleware,
    CandidatoController.update
);

router.patch(
    "/:id/curriculo",
    validarUuidParam("id"),
    validationMiddleware,
    uploadDocumento.single("curriculo"),
    processarCurriculo,
    CandidatoController.uploadCurriculo
);

// Extração (sem IA) de um rascunho a partir do arquivo — nunca grava nada
// sozinho, nunca salva o arquivo como currículo oficial (ver controller).
router.post(
    "/:id/curriculo/importar",
    validarUuidParam("id"),
    validationMiddleware,
    uploadDocumento.single("curriculo"),
    CandidatoController.importarCurriculo
);

// URL assinada e temporária do currículo (nunca uma URL permanente).
// Autorização (dono / empresa com candidatura / admin) no service.
router.get(
    "/:id/curriculo",
    validarUuidParam("id"),
    validationMiddleware,
    CandidatoController.curriculoUrl
);

// Mesma autorização acima, mas força download (Content-Disposition:
// attachment) em vez de exibição inline — mesmo padrão do anexo de
// postagem (Fase 7).
router.get(
    "/:id/curriculo/download",
    validarUuidParam("id"),
    validationMiddleware,
    CandidatoController.curriculoDownload
);

router.post(
    "/:id/deficiencias",
    validarVinculoDeficiencia,
    validationMiddleware,
    CandidatoController.vincularDeficiencia
);

router.delete(
    "/:id/deficiencias/:deficienciaId",
    validarUuidParam("id"),
    validarUuidParam("deficienciaId"),
    validationMiddleware,
    CandidatoController.desvincularDeficiencia
);

router.delete(
    "/:id",
    rbacMiddleware("administrador"),
    validarUuidParam("id"),
    validationMiddleware,
    CandidatoController.destroy
);

export default router;
