import ConversaService from "./ConversaService.js";

/**
 * Mensagens do chat.
 * Toda a autorização (participante da conversa) vive no ConversaService.
 */
class MensagemService {
    async listar(conversaId, solicitante, query) {
        return ConversaService.listarMensagens(conversaId, solicitante, query);
    }

    async enviar(conversaId, conteudo, solicitante) {
        return ConversaService.enviarMensagem(conversaId, conteudo, solicitante);
    }

    async marcarComoLidas(conversaId, solicitante) {
        return ConversaService.marcarComoLidas(conversaId, solicitante);
    }
}

export default new MensagemService();
