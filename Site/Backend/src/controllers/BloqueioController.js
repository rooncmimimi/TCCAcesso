import BloqueioService from "../services/BloqueioService.js";

class BloqueioController {
    async listar(req, res, next) {
        try {
            const dados = await BloqueioService.listarBloqueados(
                req.user.id,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async bloquear(req, res, next) {
        try {
            const resultado = await BloqueioService.bloquear(
                req.user.id,
                req.params.usuarioId
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async desbloquear(req, res, next) {
        try {
            const resultado = await BloqueioService.desbloquear(
                req.user.id,
                req.params.usuarioId
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarPrivacidade(req, res, next) {
        try {
            const resultado = await BloqueioService.atualizarPrivacidade(
                req.user.id,
                req.body.perfilPublico
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarPreferenciaMensagens(req, res, next) {
        try {
            const resultado = await BloqueioService.atualizarPreferenciaMensagens(
                req.user.id,
                req.body.preferenciaMensagens
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new BloqueioController();
