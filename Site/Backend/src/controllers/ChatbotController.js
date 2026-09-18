import ChatbotService from "../services/ChatbotService.js";

/** Conversas com o chatbot da Central de Ajuda (`/chatbot`). */
class ChatbotController {
    async listar(req, res, next) {
        try {
            const dados = await ChatbotService.listarConversas(
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async mensagens(req, res, next) {
        try {
            const dados = await ChatbotService.historico(
                req.params.conversaId,
                req.user,
                req.query
            );

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async criar(req, res, next) {
        try {
            const dados = await ChatbotService.enviar(req.body, req.user);

            return res.status(201).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async excluir(req, res, next) {
        try {
            const resultado = await ChatbotService.remover(
                req.params.conversaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new ChatbotController();
