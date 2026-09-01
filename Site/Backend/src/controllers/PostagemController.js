import PostagemService from "../services/PostagemService.js";
import SugestaoDescricaoService from "../services/SugestaoDescricaoService.js";
import ApiError from "../utils/ApiError.js";

const contextoDa = (req) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"]
});

class PostagemController {
    async index(req, res, next) {
        try {
            const dados = await PostagemService.findAll(req.query, req.user);
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const postagem = await PostagemService.findById(
                req.params.id,
                req.user
            );
            return res.status(200).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const postagem = await PostagemService.create(
                req.body,
                req.user,
                req.files || []
            );
            return res.status(201).json({ sucesso: true, postagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const postagem = await PostagemService.update(
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
     * Sugestão de descrição por IA — nunca grava nada, só devolve texto
     * sugerido para o usuário revisar. Falha do provedor de IA vira um erro
     * comum (tratado pelo errorMiddleware); o frontend trata isso como
     * "sugestão indisponível agora", nunca como impedimento para publicar.
     */
    async sugerirDescricaoAnexo(req, res, next) {
        try {
            if (!req.file) {
                throw ApiError.badRequest("Envie uma imagem para gerar a sugestão.");
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

    /** Fase 7 — URL de exibição inline de um anexo (lightbox/vídeo). */
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

    /** Fase 7 — mesma autorização, URL com download forçado. */
    async downloadAnexo(req, res, next) {
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

    async destroy(req, res, next) {
        try {
            const dados = await PostagemService.delete(
                req.params.id,
                req.user,
                contextoDa(req)
            );
            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new PostagemController();
