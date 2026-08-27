import AcessibilidadeService from "../services/AcessibilidadeService.js";

class AcessibilidadeController {
    async show(req, res, next) {
        try {
            const preferencias = await AcessibilidadeService.obter(req.user.id);

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async update(req, res, next) {
        try {
            const preferencias = await AcessibilidadeService.atualizar(
                req.user.id,
                req.body
            );

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async reset(req, res, next) {
        try {
            const preferencias = await AcessibilidadeService.restaurarPadrao(
                req.user.id
            );

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AcessibilidadeController();
