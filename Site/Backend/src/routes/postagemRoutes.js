import { Router } from "express";
import PostagemController from "../controllers/PostagemController.js";
import ComentarioController from "../controllers/ComentarioController.js";
import CurtidaController from "../controllers/CurtidaController.js";
import autenticacaoMiddleware from "../middlewares/autenticacaoMiddleware.js";
import validacaoMiddleware from "../middlewares/validacaoMiddleware.js";
import { uploadAnexos, uploadImagem, criarProcessadorArmazenamento } from "../middlewares/uploadMiddleware.js";
import { limiteSugestaoDescricao } from "../middlewares/limiteRequisicoesMiddleware.js";

// Anexos de postagem vão para `postagens/<usuarioId>/<uuid>.ext`. O `postagemId` ainda não existe
// aqui (a postagem é criada depois, na mesma requisição), então o agrupamento é por autor.
//
// `privado: true`: todo anexo novo vai para o bucket privado. A exibição sempre passa por
// `garantirAcessoAPostagem` antes de gerar a URL assinada, em vez de depender da privacidade do
// autor no momento do upload, que pode mudar.
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

router.use(autenticacaoMiddleware);

router.get("/", PostagemController.listar);

// Linha do tempo de um perfil (publicações e compartilhamentos intercalados por data). Fica antes
// de `/:id` para deixar claro que não colide, embora o Express já distinga pela quantidade de
// segmentos.
router.get(
    "/usuario/:usuarioId/linha-do-tempo",
    validarUuidParam("usuarioId"),
    validacaoMiddleware,
    PostagemController.linhaDoTempoDoUsuario
);

router.get(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    PostagemController.obter
);

router.post(
    "/",
    uploadAnexos.array("arquivos", 4),
    processarAnexosPostagem,
    validarCriacaoPostagem,
    validacaoMiddleware,
    PostagemController.criar
);

// Sugestão de descrição por IA (OpenRouter): stateless, nunca grava nada.
// Imagem enviada só para gerar o texto sugerido; a foto em si nunca é
// salva aqui (a publicação/edição de anexo continua sendo os fluxos já
// existentes, que exigem confirmação explícita do usuário).
router.post(
    "/anexos/sugerir-descricao",
    limiteSugestaoDescricao,
    uploadImagem.single("imagem"),
    PostagemController.sugerirDescricaoAnexo
);

router.put(
    "/:id",
    validarAtualizacaoPostagem,
    validacaoMiddleware,
    PostagemController.atualizar
);

router.delete(
    "/:id",
    validarUuidParam("id"),
    validacaoMiddleware,
    PostagemController.excluir
);

// Edita só a descrição acessível de um anexo já publicado, nunca o arquivo em si, com a mesma
// autorização de dono de `atualizar`.
router.patch(
    "/:id/anexos/:anexoId",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validarDescricaoAnexo,
    validacaoMiddleware,
    PostagemController.atualizarDescricaoAnexo
);

// Única forma de obter uma URL utilizável de um anexo: gerada sob demanda depois de
// `garantirAcessoAPostagem` aprovar, nunca uma URL pública fixa. Pedir `postagemId` e `anexoId`
// juntos fecha o IDOR de trocar o `anexoId` pelo de outra postagem: só resolve se o anexo pertencer
// à postagem informada.
router.get(
    "/:id/anexos/:anexoId/url",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validacaoMiddleware,
    PostagemController.urlAnexo
);

// Mesma autorização do endpoint acima, mas gera uma URL assinada com
// `Content-Disposition: attachment` (força download em vez de exibição
// inline); reautorizada do zero a cada clique, nunca reaproveita uma
// URL de exibição já emitida antes.
router.get(
    "/:id/anexos/:anexoId/download",
    validarUuidParam("id"),
    validarUuidParam("anexoId"),
    validacaoMiddleware,
    PostagemController.baixarAnexo
);

/* Comentários */
router.get(
    "/:postagemId/comentarios",
    validarUuidParam("postagemId"),
    validacaoMiddleware,
    ComentarioController.listar
);

router.post(
    "/:postagemId/comentarios",
    validarCriacaoComentario,
    validacaoMiddleware,
    ComentarioController.criar
);

/* Curtidas */
router.get(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validacaoMiddleware,
    CurtidaController.listar
);

router.post(
    "/:postagemId/curtidas",
    validarUuidParam("postagemId"),
    validacaoMiddleware,
    CurtidaController.alternar
);

export default router;
