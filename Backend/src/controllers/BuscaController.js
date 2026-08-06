import BuscaService from "../services/BuscaService.js";

class BuscaController {
    async index(req, res, next) {
        try {
            const dados = await BuscaService.buscar(req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new BuscaController();
