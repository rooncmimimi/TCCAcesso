import NotificacaoService from "../services/NotificacaoService.js";

class NotificacaoController {
    async index(req, res, next) {
        try {
            const dados = await NotificacaoService.listar(req.user, req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async naoLidas(req, res, next) {
        try {
            const dados = await NotificacaoService.contarNaoLidas(req.user);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async marcarComoLida(req, res, next) {
        try {
            const notificacao = await NotificacaoService.marcarComoLida(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, notificacao });
        } catch (erro) {
            return next(erro);
        }
    }

    async marcarTodas(req, res, next) {
        try {
            const resultado = await NotificacaoService.marcarTodasComoLidas(
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
        try {
            const resultado = await NotificacaoService.remover(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    async obterPreferencias(req, res, next) {
        try {
            const preferencias = await NotificacaoService.obterPreferencias(
                req.user.id
            );

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }

    async atualizarPreferencias(req, res, next) {
        try {
            const preferencias = await NotificacaoService.atualizarPreferencias(
                req.user.id,
                req.body
            );

            return res.status(200).json({ sucesso: true, preferencias });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new NotificacaoController();
