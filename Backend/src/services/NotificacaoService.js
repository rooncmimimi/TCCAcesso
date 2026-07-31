import { Notificacao } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

/**
 * Notificações — sempre escopadas ao usuário autenticado.
 */
class NotificacaoService {
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

        return notificacao;
    }

    async marcarTodasComoLidas(solicitante) {
        await Notificacao.update(
            { lida: true },
            { where: { usuarioId: solicitante.id, lida: false } }
        );

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
