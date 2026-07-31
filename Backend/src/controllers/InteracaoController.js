import InteracaoService from "../services/InteracaoService.js";

class InteracaoController {
    async toggleFavorito(req, res, next) {
        try {
            const resultado = await InteracaoService.alternarFavorito(
                req.params.vagaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async listarFavoritos(req, res, next) {
        try {
            const dados = await InteracaoService.listarFavoritos(
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async toggleSeguir(req, res, next) {
        try {
            const resultado = await InteracaoService.alternarSeguir(
                req.params.empresaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async listarSeguidas(req, res, next) {
        try {
            const dados = await InteracaoService.listarSeguidas(
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new InteracaoController();
