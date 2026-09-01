import CompartilhamentoService from "../services/CompartilhamentoService.js";

class CompartilhamentoController {
    async porUsuario(req, res, next) {
        try {
            const dados = await CompartilhamentoService.listarPorUsuario(
                req.params.usuarioId,
                req.query,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async index(req, res, next) {
        try {
            const dados = await CompartilhamentoService.listarPorPostagem(
                req.params.postagemId,
                req.query,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const compartilhamento = await CompartilhamentoService.compartilhar(
                req.params.postagemId,
                req.body.comentario,
                req.user
            );

            return res
                .status(201)
                .json({ sucesso: true, compartilhamento });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await CompartilhamentoService.remover(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new CompartilhamentoController();
