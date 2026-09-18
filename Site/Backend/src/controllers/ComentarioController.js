import ComentarioService from "../services/ComentarioService.js";
import { contextoRequisicao } from "../utils/contextoRequisicao.js";

/**
 * Comentários: listar e criar em `/postagens/:postagemId/comentarios`, excluir em
 * `DELETE /comentarios/:id`.
 */
class ComentarioController {
    async listar(req, res, next) {
        try {
            const dados = await ComentarioService.listarPorPostagem(
                req.params.postagemId,
                req.query,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const comentario = await ComentarioService.criar(
                req.params.postagemId,
                req.body.comentario,
                req.user,
                req.body.comentarioPaiId || null
            );

            return res.status(201).json({ sucesso: true, comentario });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await ComentarioService.excluir(
                req.params.id,
                req.user,
                contextoRequisicao(req)
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new ComentarioController();
