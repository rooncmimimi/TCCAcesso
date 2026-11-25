import { Router } from "express";
import CandidatoController from "../controllers/CandidatoController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import exigirTipoUsuarioMiddleware from "../middlewares/exigirTipoUsuarioMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import {
    uploadDocumento,
    uploadCurriculoParaImportar,
    conferirConteudoDoArquivo,
    criarProcessadorArmazenamento
} from "../middlewares/uploadMiddleware.js";
import { garantirDonoDeCandidato } from "../middlewares/garantirDonoMiddleware.js";
import { limiteCompletarCurriculo } from "../middlewares/limiteRequisicoesMiddleware.js";
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
    uploadCurriculoParaImportar.single("curriculo"),
    conferirConteudoDoArquivo(),
    CandidatoController.importarCurriculo
);

// Sem chave de IA configurada, o Site não mostra o botão: perguntar é mais honesto do que oferecer
// um botão que sempre dá erro.
router.get("/curriculo/completar/disponibilidade", CandidatoController.disponibilidadeCompletarCurriculo);

// A mesma importação, mas pedindo ao modelo o que as regras não conseguiram ler. Rota separada de
// propósito: é a pessoa que escolhe gastar isso, depois de ver o que ficou em branco, e o limite
// por hora é próprio. O arquivo continua sem ser guardado.
router.post(
    "/:id/curriculo/completar",
    validarUuidParam("id"),
    validacaoMiddleware,
    limiteCompletarCurriculo,
    uploadCurriculoParaImportar.single("curriculo"),
    conferirConteudoDoArquivo(),
    (req, res, next) => {
        req.completarComIa = true;
        return next();
    },
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

export default router;
