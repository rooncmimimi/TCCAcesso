import { Router } from "express";
import PostagemController from "../controllers/PostagemController.js";
import ComentarioController from "../controllers/ComentarioController.js";
import CurtidaController from "../controllers/CurtidaController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validationMiddleware from "../middlewares/validationMiddleware.js";
import { uploadAnexos, uploadImagem, criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";
import { sugestaoDescricaoLimiter } from "../middlewares/rateLimitMiddleware.js";

// Anexos de postagem vão para `postagens/<usuarioId>/<uuid>.ext`. O
// postagemId ainda não existe neste ponto (a postagem é criada depois,
// na mesma requisição), então agrupamos por autor.
//
// `privado: true` (Fase 7): todo anexo novo vai para o bucket PRIVADO,
// sem exceção — a autorização de exibição (garantirAcessoAPostagem) é
// sempre checada antes de gerar uma URL assinada, nunca inferida da
// privacidade do autor no momento do upload (que pode mudar depois).
const processarAnexosPostagem = criarProcessadorArmazenamento({
    pasta: (req) => `postagens/${req.user.id}`,
    privado: true
});
import { validarUuidParam } from "../validators/usuarioValidator.js";
import {
    validarCriacaoPostagem,
    validarAtualizacaoPostagem,
    validarDescricaoAnexo
} from "../validators/postagemValidator.js";
import { validarCriacaoComentario } from "../validators/comentarioValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", PostagemController.index);

router.get(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    PostagemController.show
);

router.post(
    "/",
    uploadAnexos.array("arquivos", 4),
    processarAnexosPostagem,
    validarCriacaoPostagem,
    validationMiddleware,
    PostagemController.store
);

// Sugestão de descrição por IA (OpenRouter) — stateless, nunca grava nada.
// Imagem enviada só para gerar o texto sugerido; a foto em si nunca é
// salva aqui (a publicação/edição de anexo continua sendo os fluxos já
// existentes, que exigem confirmação explícita do usuário).
router.post(
    "/anexos/sugerir-descricao",
    sugestaoDescricaoLimiter,
    uploadImagem.single("imagem"),
    PostagemController.sugerirDescricaoAnexo
);

router.put(
    "/:id",
    validarAtualizacaoPostagem,
    validationMiddleware,
    PostagemController.update
);

router.delete(
    "/:id",
    validarUuidParam("id"),
    validationMiddleware,
    PostagemController.destroy
);

// Edita só a descrição acessível de um anexo já publicado — nunca o
// arquivo em si. Reaproveita a mesma autorização de dono de `update`.
router.patch(
    "/:id/anexos/:anexoId",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validarDescricaoAnexo,
    validationMiddleware,
    PostagemController.atualizarDescricaoAnexo
);

// Fase 7: única forma de obter uma URL utilizável de um anexo — sempre
// gerada sob demanda, depois de `garantirAcessoAPostagem` aprovar (nunca
// uma URL pública fixa). `postagemId` + `anexoId` juntos (não só o
// anexoId) fecham o caminho de IDOR "trocar o anexoId por um de outra
// postagem": só resolve se o anexo pertencer À POSTAGEM informada.
router.get(
    "/:id/anexos/:anexoId/url",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validationMiddleware,
    PostagemController.urlAnexo
);

// Mesma autorização do endpoint acima, mas gera uma URL assinada com
// `Content-Disposition: attachment` (força download em vez de exibição
// inline) — reautorizada do zero a cada clique, nunca reaproveita uma
// URL de exibição já emitida antes.
router.get(
    "/:id/anexos/:anexoId/download",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validationMiddleware,
    PostagemController.downloadAnexo
);

/* ---------- Comentários ---------- */
router.get(
    "/:postagemId/comentarios",
    validarUuidParam("postagemId"),
    validationMiddleware,
    ComentarioController.index
);

router.post(
    "/:postagemId/comentarios",
    validarCriacaoComentario,
    validationMiddleware,
    ComentarioController.store
);

/* ---------- Curtidas ---------- */
router.get(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validationMiddleware,
    CurtidaController.index
);

router.post(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validationMiddleware,
    CurtidaController.toggle
);

export default router;
