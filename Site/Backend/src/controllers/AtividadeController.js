import AtividadeService from "../services/AtividadeService.js";

class AtividadeController {
    async minha(req, res, next) {
        try {
            const atividade = await AtividadeService.minha(req.user);
            return res.status(200).json({ sucesso: true, atividade });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AtividadeController();
