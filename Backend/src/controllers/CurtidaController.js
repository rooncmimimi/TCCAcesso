import CurtidaService from "../services/CurtidaService.js";

class CurtidaController {
    async toggle(req, res, next) {
        try {
            const resultado = await CurtidaService.alternar(
                req.params.postagemId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async index(req, res, next) {
        try {
            const curtidas = await CurtidaService.listarPorPostagem(
                req.params.postagemId
            );

            return res.status(200).json({ sucesso: true, curtidas });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new CurtidaController();
