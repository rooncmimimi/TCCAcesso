import ChatbotService from "../services/ChatbotService.js";

class ChatbotController {
    async index(req, res, next) {
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

    async store(req, res, next) {
        try {
            const dados = await ChatbotService.enviar(req.body, req.user);

            return res.status(201).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async destroy(req, res, next) {
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
