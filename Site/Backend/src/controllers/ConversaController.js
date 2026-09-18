import ConversaService from "../services/ConversaService.js";

/**
 * Conversas do chat (`/conversas`): lista, abertura, total de não lidas e a consulta
 * `pode-iniciar`. As mensagens ficam no `MensagemController`.
 */
class ConversaController {
    async listar(req, res, next) {
        try {
            const dados = await ConversaService.listar(req.user, req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const conversa = await ConversaService.abrir(req.body, req.user);

            return res.status(201).json({ sucesso: true, conversa });
        } catch (erro) {
            return next(erro);
        }
    }

    async obter(req, res, next) {
        try {
            const conversa = await ConversaService.buscarPorId(
                req.params.id,
                req.user
            );

            return res.status(200).json({ sucesso: true, conversa });
        } catch (erro) {
            return next(erro);
        }
    }

    async naoLidas(req, res, next) {
        try {
            const dados = await ConversaService.contarNaoLidas(req.user);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    /**
     * Consulta, sem lançar 4xx, usada pelos clientes para decidir o estado do botão "Enviar
     * mensagem" antes do clique. Usa a mesma função central que `abrir()` usa para autorizar a
     * criação.
     */
    async podeIniciar(req, res, next) {
        try {
            const resultado = await ConversaService.podeIniciarConversa(
                req.user.id,
                req.params.usuarioId
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new ConversaController();
