import ComentarioService from "../services/ComentarioService.js";

class ComentarioController {
    async index(req, res, next) {
        try {
            const dados = await ComentarioService.listarPorPostagem(
                req.params.postagemId,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const comentario = await ComentarioService.create(
                req.params.postagemId,
                req.body.comentario,
                req.user
            );

            return res.status(201).json({ sucesso: true, comentario });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await ComentarioService.delete(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new ComentarioController();
