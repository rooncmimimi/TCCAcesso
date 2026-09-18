import { Router } from "express";
import CandidatoController from "../controllers/CandidatoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { uploadDocumento, criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";
import { garantirDonoDeCandidato } from "../middlewares/garantirDonoMiddleware.js";
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarAtualizacaoCandidato,
    validarVinculoDeficiencia
} from "../validators/candidatoValidator.js";

const router = Router();

// Currículo vai para `curriculos/<candidatoId>/<uuid>.ext` no bucket privado e nunca vira URL
// pública.
const processarCurriculo = criarProcessadorArmazenamento({
    pasta: (req) => `curriculos/${req.params.id}`,
    privado: true
});

router.use(autenticacaoMiddleware);

// Perfil do candidato autenticado.
router.get("/me", CandidatoController.perfilAtual);

// Busca de talentos: empresas e administradores.
router.get(
    "/",
    exigirTipoUsuarioMiddleware("empresa", "administrador"),
    CandidatoController.listar
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidatoController.obter
);

router.put(
    "/:id",
    validarAtualizacaoCandidato,
    validacaoMiddleware,
    CandidatoController.atualizar
);

router.patch(
    "/:id/curriculo",
    validarUuidParam("id"),
    validacaoMiddleware,
    garantirDonoDeCandidato,
    uploadDocumento.single("curriculo"),
    processarCurriculo,
    CandidatoController.enviarCurriculo
);

// Extração (sem IA) de um rascunho a partir do arquivo: nunca grava nada
// sozinho, nunca salva o arquivo como currículo oficial (ver controller).
router.post(
    "/:id/curriculo/importar",
    validarUuidParam("id"),
    validacaoMiddleware,
    uploadDocumento.single("curriculo"),
    CandidatoController.importarCurriculo
);

// URL assinada e temporária do currículo (nunca uma URL permanente).
// Autorização (dono / empresa com candidatura / admin) no service.
router.get(
    "/:id/curriculo",
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidatoController.urlCurriculo
);

// Mesma autorização acima, mas força download (`Content-Disposition: attachment`) em vez de
// exibição inline, como no anexo de postagem.
router.get(
    "/:id/curriculo/download",
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidatoController.baixarCurriculo
);

router.post(
    "/:id/deficiencias",
    validarVinculoDeficiencia,
    validacaoMiddleware,
    CandidatoController.vincularDeficiencia
);

router.delete(
    "/:id/deficiencias/:deficienciaId",
    validarUuidParam("id"),
    validarUuidParam("deficienciaId"),
    validacaoMiddleware,
    CandidatoController.desvincularDeficiencia
);

router.delete(
    "/:id",
    exigirTipoUsuarioMiddleware("administrador"),
    validarUuidParam("id"),
    validacaoMiddleware,
    CandidatoController.excluir
);

export default router;
