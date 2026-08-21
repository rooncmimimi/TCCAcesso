import AutenticacaoDoisFatoresService from "../services/AutenticacaoDoisFatoresService.js";

class AutenticacaoDoisFatoresController {
    async status(req, res, next) {
        try {
            const status = await AutenticacaoDoisFatoresService.status(req.user.id);

            return res.status(200).json({ sucesso: true, ...status });
        } catch (erro) {
            return next(erro);
        }
    }

    async iniciar(req, res, next) {
        try {
            const dados = await AutenticacaoDoisFatoresService.iniciarAtivacao(
                req.user,
                req.body.senhaAtual
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async confirmar(req, res, next) {
        try {
            const dados = await AutenticacaoDoisFatoresService.confirmarAtivacao(
                req.user.id,
                req.body.codigo
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async desativar(req, res, next) {
        try {
            const dados = await AutenticacaoDoisFatoresService.desativar(
                req.user,
                req.body.senhaAtual
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new AutenticacaoDoisFatoresController();
