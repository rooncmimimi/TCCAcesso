import { Notificacao } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { emitirParaUsuario } from "../realtime/socket.js";

/**
 * Notificações — sempre escopadas ao usuário autenticado.
 */
class NotificacaoService {
    /**
     * Cria uma notificação interna e a entrega em tempo real.
     * Falhas aqui nunca devem derrubar a ação principal do usuário.
     */
    async criar({ usuarioId, tipo, titulo, descricao = null }) {
        try {
            const notificacao = await Notificacao.create({
                usuarioId,
                tipo,
                titulo,
                descricao
            });

            const naoLidas = await Notificacao.count({
                where: { usuarioId, lida: false }
            });

            emitirParaUsuario(usuarioId, "notificacao:nova", {
                notificacao,
                naoLidas
            });

            return notificacao;
        } catch (erro) {
            console.error("Falha ao criar notificação:", erro.message);
            return null;
        }
    }

    async listar(solicitante, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { usuarioId: solicitante.id };

        if (query.lida !== undefined) {
            where.lida = query.lida === "true" || query.lida === true;
        }

        if (query.tipo) {
            where.tipo = query.tipo;
        }

        const { rows, count } = await Notificacao.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("notificacoes", rows, count, pagina, limite);
    }

    async contarNaoLidas(solicitante) {
        const total = await Notificacao.count({
            where: { usuarioId: solicitante.id, lida: false }
        });

        return { naoLidas: total };
    }

    async marcarComoLida(id, solicitante) {
        const notificacao = await Notificacao.findOne({
            where: { id, usuarioId: solicitante.id }
        });

        if (!notificacao) {
            throw ApiError.notFound("Notificação não encontrada.");
        }

        notificacao.lida = true;
        await notificacao.save();

        emitirParaUsuario(solicitante.id, "notificacao:atualizada", {
            id: notificacao.id,
            lida: true
        });

        return notificacao;
    }

    async marcarTodasComoLidas(solicitante) {
        await Notificacao.update(
            { lida: true },
            { where: { usuarioId: solicitante.id, lida: false } }
        );

        emitirParaUsuario(solicitante.id, "notificacao:atualizada", {
            todas: true,
            naoLidas: 0
        });

        return { mensagem: "Todas as notificações foram marcadas como lidas." };
    }

    async remover(id, solicitante) {
        const removidos = await Notificacao.destroy({
            where: { id, usuarioId: solicitante.id }
        });

        if (removidos === 0) {
            throw ApiError.notFound("Notificação não encontrada.");
        }

        return { mensagem: "Notificação removida." };
    }
}

export default new NotificacaoService();
