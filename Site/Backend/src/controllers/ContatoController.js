import ContatoService from "../services/ContatoService.js";

/** Fale conosco (`POST /contato`, público). */
class ContatoController {
    async enviar(req, res, next) {
        try {
            // Só os campos do formulário seguem para o serviço, nada mais do corpo da requisição.
            const { nome, email, assunto, mensagem, website } = req.body;
            const { protocolo } = await ContatoService.enviar({ nome, email, assunto, mensagem, website });

            return res.status(201).json({ sucesso: true, protocolo, mensagem: "Recebemos a sua mensagem." });
        } catch (erro) {
            return next(erro);
        }
    }
}

export default new ContatoController();
