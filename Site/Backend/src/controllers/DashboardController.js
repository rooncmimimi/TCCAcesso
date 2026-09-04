import DashboardService from "../services/DashboardService.js";

class DashboardController {
    async admin(req, res, next) {
        try {
            const metricas = await DashboardService.admin();

            return res.status(200).json({ sucesso: true, metricas });
        } catch (erro) {
            return next(erro);
        }
    }

    async empresa(req, res, next) {
        try {
            const metricas = await DashboardService.empresa(req.user);

            return res.status(200).json({ sucesso: true, metricas });
        } catch (erro) {
            return next(erro);
        }
    }

    async candidato(req, res, next) {
        try {
            const metricas = await DashboardService.candidato(req.user.id);

            return res.status(200).json({ sucesso: true, metricas });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new DashboardController();
