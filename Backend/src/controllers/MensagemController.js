import MensagemService from "../services/MensagemService.js";

class MensagemController {
    async index(req, res, next) {
        try {
            const dados = await MensagemService.listar(
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
            const mensagem = await MensagemService.enviar(
                req.params.conversaId,
                req.body.conteudo,
                req.user
            );

            return res.status(201).json({ sucesso: true, mensagem });
        } catch (erro) {
            return next(erro);
        }
    }

    async marcarComoLidas(req, res, next) {
        try {
            const resultado = await MensagemService.marcarComoLidas(
                req.params.conversaId,
                req.user
            );

            return res.status(200).json({ sucesso: true, ...resultado });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new MensagemController();
