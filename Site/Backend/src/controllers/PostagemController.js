import PostagemService from "../services/PostagemService.js";
import SugestaoDescricaoService from "../services/SugestaoDescricaoService.js";
import ErroApi from "../utils/ErroApi.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Postagens (`/postagens`): feed, linha do tempo de um perfil, criação, edição e exclusão, anexos
 * (descrição, URL assinada e download) e sugestão de descrição por IA.
 */
class PostagemController {
    async listar(req, res, next) {
        try {
            const dados = await PostagemService.listar(req.query, req.user);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Linha do tempo de um perfil: publicações e compartilhamentos intercalados por data. */
    async linhaDoTempoDoUsuario(req, res, next) {
        try {
            const dados = await PostagemService.linhaDoTempoDoUsuario(
                req.params.usuarioId,
                req.query,
                req.user
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const postagem = await PostagemService.buscarPorId(
                req.params.id,
                req.user
            );
            return res.status(200).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const postagem = await PostagemService.criar(
                req.body,
                req.user,
                req.files || []
            );
            return res.status(201).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizar(req, res, next) {
        try {
            const postagem = await PostagemService.atualizar(
                req.params.id,
                req.body,
                req.user
            );
            return res.status(200).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarDescricaoAnexo(req, res, next) {
        try {
            const postagem = await PostagemService.atualizarDescricaoAnexo(
                req.params.id,
                req.params.anexoId,
                req.body.descricao,
                req.user
            );
            return res.status(200).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Sugestão de descrição por IA: nunca grava nada, só devolve texto
     * sugerido para o usuário revisar. Falha do provedor de IA vira um erro
     * comum (tratado pelo erroMiddleware); o frontend trata isso como
     * "sugestão indisponível agora", nunca como impedimento para publicar.
     */
    async sugerirDescricaoAnexo(req, res, next) {
        try {
            if (!req.file) {
                throw ErroApi.requisicaoInvalida("Envie uma imagem para gerar a sugestão.");
            }

            const descricao = await SugestaoDescricaoService.sugerir(
                req.file.buffer,
                req.file.mimetype
            );

            return res.status(200).json({ sucesso: true, descricao });
        } catch (erro) {
            return next(erro);
        }
    }

    /** URL de exibição inline de um anexo (lightbox ou vídeo). */
    async urlAnexo(req, res, next) {
        try {
            const resultado = await PostagemService.gerarUrlAnexo(
                req.params.id,
                req.params.anexoId,
                req.user
            );
            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Mesma autorização, com download forçado. */
    async baixarAnexo(req, res, next) {
        try {
            const resultado = await PostagemService.gerarUrlAnexo(
                req.params.id,
                req.params.anexoId,
                req.user,
                { baixar: true }
            );
            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const dados = await PostagemService.excluir(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new PostagemController();
