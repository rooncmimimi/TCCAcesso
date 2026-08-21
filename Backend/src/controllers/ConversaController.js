import ConversaService from "../services/ConversaService.js";

class ConversaController {
    async index(req, res, next) {
        try {
            const dados = await ConversaService.listar(req.user, req.query);

            return res.status(200).json({ sucesso: true, ...dados });
        } catch (erro) {
            return next(erro);
        }
    }

    async store(req, res, next) {
        try {
            const conversa = await ConversaService.abrir(req.body, req.user);

            return res.status(201).json({ sucesso: true, conversa });
        } catch (erro) {
            return next(erro);
        }
    }

    async show(req, res, next) {
        try {
            const conversa = await ConversaService.findById(
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
}

export default new ConversaController();
