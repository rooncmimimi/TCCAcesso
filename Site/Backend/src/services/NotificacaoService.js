import { Notificacao, PreferenciaNotificacao, Usuario } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { emitirParaUsuario } from "../realtime/socket.js";

/**
 * Mapeia o tipo da notificação para a coluna de preferência correspondente.
 * "Sistema" nunca é filtrado — carrega avisos críticos da própria conta
 * (aprovação de empresa, bloqueio) que o usuário não deve conseguir silenciar.
 */
const COLUNA_PREFERENCIA_POR_TIPO = {
    Vaga: "vagasCandidaturas",
    Candidatura: "vagasCandidaturas",
    Mensagem: "mensagens",
    Feed: "publicacoesComentarios"
};

// Dados do ator (quem praticou a ação) expostos por uma notificação —
// deliberadamente restrito a id/nome/foto: nunca CPF, e-mail, endereço,
// currículo ou qualquer outro dado privado, mesmo que o model Usuario os
// tenha. Reaproveitado tanto na criação (socket) quanto na listagem.
const INCLUIR_ATOR = {
    model: Usuario,
    as: "ator",
    attributes: ["id", "nome", "fotoPerfil"]
};

/**
 * Verifica se o usuário aceita notificações desse tipo.
 *
 * Reaproveitado por todo lugar que cria uma `Notificacao` — inclusive os
 * poucos services que criam direto via `Notificacao.create` (dentro de uma
 * transação própria, ex.: `ConversaService`, `CandidaturaService`) em vez de
 * passar por `NotificacaoService.criar`.
 */
export async function notificacaoPermitida(usuarioId, tipo) {
    const coluna = COLUNA_PREFERENCIA_POR_TIPO[tipo];

    if (!coluna) {
        return true;
    }

    const preferencia = await PreferenciaNotificacao.findOne({
        where: { usuarioId }
    });

    return !(preferencia && preferencia[coluna] === false);
}

/**
 * Notificações — sempre escopadas ao usuário autenticado.
 */
class NotificacaoService {
    /**
     * Cria uma notificação interna e a entrega em tempo real.
     * Falhas aqui nunca devem derrubar a ação principal do usuário.
     *
     * `subtipo`/`entidadeTipo`/`entidadeId`/`atorId` (migration 0033) são
     * opcionais — quem chama sem eles continua funcionando exatamente
     * como antes, só sem link/avatar na notificação criada.
     *
     * `transaction`: opcional, para participar de uma transação já aberta
     * por quem chama (mesmo padrão de `RefreshTokenService.emitir`) —
     * necessário para os chamadores que criam a notificação dentro da
     * mesma transação do evento principal (ex.: nova candidatura).
     */
    async criar(
        {
            usuarioId,
            tipo,
            titulo,
            descricao = null,
            subtipo = null,
            entidadeTipo = null,
            entidadeId = null,
            atorId = null
        },
        { transaction } = {}
    ) {
        try {
            if (!(await notificacaoPermitida(usuarioId, tipo))) {
                return null;
            }

            const criada = await Notificacao.create(
                {
                    usuarioId,
                    tipo,
                    titulo,
                    descricao,
                    subtipo,
                    entidadeTipo,
                    entidadeId,
                    atorId
                },
                { transaction }
            );

            // Recarrega com o ator incluso (id/nome/foto) — o `create` não
            // traz a associação, e o frontend precisa disso para o avatar.
            const notificacao = await Notificacao.findByPk(criada.id, {
                include: [INCLUIR_ATOR],
                transaction
            });

            const naoLidas = await Notificacao.count({
                where: { usuarioId, lida: false },
                transaction
            });

            // Se `transaction` foi passada, quem chamou ainda não deu
            // commit — emitir o socket agora anunciaria uma notificação
            // que pode nunca existir de verdade (rollback). Nesse caso só
            // devolvemos os dados; quem chamou emite depois do commit via
            // `emitirNotificacaoCriada` (mesmo padrão de "tempo real só
            // depois de persistir" já usado em `ConversaService`).
            if (!transaction) {
                emitirParaUsuario(usuarioId, "notificacao:nova", {
                    notificacao,
                    naoLidas
                });
            }

            return notificacao;
        } catch (erro) {
            console.error("Falha ao criar notificação:", erro.message);
            return null;
        }
    }

    /**
     * Emite o evento em tempo real de uma notificação já criada via
     * `criar(..., { transaction })` — chamar só DEPOIS do commit da
     * transação do chamador. Nunca lança (mesmo princípio de `criar`).
     */
    emitirNotificacaoCriada(notificacao, naoLidas) {
        if (!notificacao) return;

        try {
            emitirParaUsuario(notificacao.usuarioId, "notificacao:nova", {
                notificacao,
                naoLidas
            });
        } catch (erro) {
            console.error("Falha ao emitir notificação em tempo real:", erro.message);
        }
    }

    /** Conta não lidas de um usuário — exposto para quem precisa recalcular após um commit. */
    async contarNaoLidasDe(usuarioId) {
        return Notificacao.count({ where: { usuarioId, lida: false } });
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
            include: [INCLUIR_ATOR],
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

    /* ==========================================================
       PREFERÊNCIAS DE NOTIFICAÇÃO (Configurações)
    ========================================================== */
    async obterPreferencias(usuarioId) {
        const [preferencia] = await PreferenciaNotificacao.findOrCreate({
            where: { usuarioId },
            defaults: { usuarioId }
        });

        return preferencia;
    }

    async atualizarPreferencias(usuarioId, dados) {
        const [preferencia] = await PreferenciaNotificacao.findOrCreate({
            where: { usuarioId },
            defaults: { usuarioId }
        });

        const campos = [
            "vagasCandidaturas",
            "mensagens",
            "publicacoesComentarios",
            "redeSeguidores"
        ];

        const atualizacao = campos.reduce((acc, campo) => {
            if (typeof dados[campo] === "boolean") {
                acc[campo] = dados[campo];
            }
            return acc;
        }, {});

        await preferencia.update(atualizacao);

        return preferencia;
    }
}

export default new NotificacaoService();
