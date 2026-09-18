import NotificacaoService from "../services/NotificacaoService.js";
import NotificacaoPushService from "../services/NotificacaoPushService.js";

/**
 * Notificações do usuário (`/notificacoes`), preferências de notificação e o token de push do app.
 */
class NotificacaoController {
    async listar(req, res, next) {
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

    async excluir(req, res, next) {
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

    /** Registra ou atualiza o Expo push token do aparelho atual. */
    async registrarPushToken(req, res, next) {
        try {
            const resultado = await NotificacaoPushService.registrar(
                req.user.id,
                req.body.token,
                req.body.plataforma
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }

    /** Remove o token ao sair da conta no app (idempotente). */
    async removerPushToken(req, res, next) {
        try {
            const resultado = await NotificacaoPushService.remover(req.body.token);

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
