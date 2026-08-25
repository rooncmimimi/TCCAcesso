import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Conversa,
    Mensagem,
    Empresa,
    Usuario,
    Notificacao
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import {
    emitirParaConversa,
    emitirParaUsuario
} from "../realtime/socket.js";
import { notificacaoPermitida } from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

const ATRIBUTOS_PARTICIPANTE = ["id", "nome", "fotoPerfil", "tipoUsuario"];

const INCLUDE_PARTICIPANTES = [
    {
        model: Usuario,
        as: "usuarioA",
        attributes: ATRIBUTOS_PARTICIPANTE,
        include: [
            {
                model: Empresa,
                as: "empresa",
                attributes: ["id", "nomeFantasia", "razaoSocial", "logo"],
                required: false
            }
        ]
    },
    {
        model: Usuario,
        as: "usuarioB",
        attributes: ATRIBUTOS_PARTICIPANTE,
        include: [
            {
                model: Empresa,
                as: "empresa",
                attributes: ["id", "nomeFantasia", "razaoSocial", "logo"],
                required: false
            }
        ]
    }
];

/**
 * Chat 1:1 entre quaisquer dois usuários autenticados (candidato, empresa
 * ou administrador) — qualquer usuário pode conversar com qualquer outro,
 * respeitando bloqueios existentes.
 *
 * Toda leitura/escrita valida se o usuário autenticado é um dos dois
 * participantes da conversa (proteção contra IDOR — OWASP A01). Ser
 * administrador NÃO concede acesso a conversas das quais não participa.
 */
class ConversaService {
    async carregarConversa(id, transaction) {
        const conversa = await Conversa.findByPk(id, {
            include: INCLUDE_PARTICIPANTES,
            transaction
        });

        if (!conversa) {
            throw ApiError.notFound("Conversa não encontrada.");
        }

        return conversa;
    }

    garantirParticipante(conversa, solicitante) {
        const usuarios = [conversa.usuarioAId, conversa.usuarioBId];

        if (!usuarios.includes(solicitante.id)) {
            throw ApiError.forbidden("Você não participa desta conversa.");
        }
    }

    /* ==========================================================
       ABRIR / RECUPERAR CONVERSA
    ========================================================== */
    async abrir({ usuarioId }, solicitante) {
        if (String(usuarioId) === String(solicitante.id)) {
            throw ApiError.badRequest(
                "Você não pode iniciar uma conversa consigo mesmo."
            );
        }

        const alvo = await Usuario.findByPk(usuarioId, {
            attributes: ["id", "ativo", "bloqueado"]
        });

        if (!alvo || !alvo.ativo || alvo.bloqueado) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        if (
            await BloqueioService.estaBloqueadoEntre(solicitante.id, usuarioId)
        ) {
            throw ApiError.forbidden("Não é possível iniciar esta conversa.");
        }

        const [usuarioAId, usuarioBId] = [
            String(solicitante.id).toLowerCase(),
            String(usuarioId).toLowerCase()
        ].sort();

        const [conversa] = await Conversa.findOrCreate({
            where: { usuarioAId, usuarioBId },
            defaults: { ultimaMensagem: new Date() }
        });

        return this.carregarConversa(conversa.id);
    }

    /* ==========================================================
       LISTAR CONVERSAS DO USUÁRIO
    ========================================================== */
    async listar(solicitante, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const filtros = [
            { usuarioAId: solicitante.id },
            { usuarioBId: solicitante.id }
        ];

        const { rows, count } = await Conversa.findAndCountAll({
            where: { [Op.or]: filtros },
            include: INCLUDE_PARTICIPANTES,
            limit: limite,
            offset,
            distinct: true,
            order: [["ultima_mensagem", "DESC NULLS LAST"]]
        });

        const idsConversas = rows.map((conversa) => conversa.id);

        const contagens = idsConversas.length
            ? await Mensagem.findAll({
                  attributes: [
                      "conversaId",
                      [sequelize.fn("COUNT", sequelize.col("id")), "total"]
                  ],
                  where: {
                      conversaId: { [Op.in]: idsConversas },
                      remetenteId: { [Op.ne]: solicitante.id },
                      lida: false
                  },
                  group: ["conversaId"],
                  raw: true
              })
            : [];

        const mapaNaoLidas = Object.fromEntries(
            contagens.map((c) => [c.conversaId, Number(c.total)])
        );

        const comContagem = rows.map((conversa) => ({
            ...conversa.toJSON(),
            mensagensNaoLidas: mapaNaoLidas[conversa.id] ?? 0
        }));

        return montarResposta("conversas", comContagem, count, pagina, limite);
    }

    /* ==========================================================
       TOTAL DE MENSAGENS NÃO LIDAS (para o badge do cabeçalho)
    ========================================================== */
    async contarNaoLidas(solicitante) {
        const total = await Mensagem.count({
            where: {
                remetenteId: { [Op.ne]: solicitante.id },
                lida: false
            },
            include: [
                {
                    model: Conversa,
                    as: "conversa",
                    attributes: [],
                    where: {
                        [Op.or]: [
                            { usuarioAId: solicitante.id },
                            { usuarioBId: solicitante.id }
                        ]
                    }
                }
            ]
        });

        return { naoLidas: total };
    }

    /* ==========================================================
       DETALHE
    ========================================================== */
    async findById(id, solicitante) {
        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        return conversa;
    }

    /* ==========================================================
       MENSAGENS DA CONVERSA
    ========================================================== */
    async listarMensagens(id, solicitante, query) {
        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Mensagem.findAndCountAll({
            where: { conversaId: id },
            include: [
                {
                    model: Usuario,
                    as: "remetente",
                    attributes: ["id", "nome", "fotoPerfil"]
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "ASC"]]
        });

        return montarResposta("mensagens", rows, count, pagina, limite);
    }

    /* ==========================================================
       ENVIAR MENSAGEM
    ========================================================== */
    async enviarMensagem(id, conteudo, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const conversa = await this.carregarConversa(id, transaction);

            this.garantirParticipante(conversa, solicitante);

            // Bloqueio pode ter acontecido DEPOIS da conversa já existir —
            // uma conversa ativa também deve parar de funcionar.
            if (
                await BloqueioService.estaBloqueadoEntre(
                    conversa.usuarioAId,
                    conversa.usuarioBId
                )
            ) {
                throw ApiError.forbidden(
                    "Não é possível enviar mensagens nesta conversa."
                );
            }

            const mensagem = await Mensagem.create(
                {
                    conversaId: id,
                    remetenteId: solicitante.id,
                    conteudo
                },
                { transaction }
            );

            await conversa.update(
                { ultimaMensagem: new Date() },
                { transaction }
            );

            const destinatarioId =
                conversa.usuarioAId === solicitante.id
                    ? conversa.usuarioBId
                    : conversa.usuarioAId;

            if (await notificacaoPermitida(destinatarioId, "Mensagem")) {
                await Notificacao.create(
                    {
                        usuarioId: destinatarioId,
                        tipo: "Mensagem",
                        titulo: "Nova mensagem recebida",
                        descricao: "Você recebeu uma nova mensagem no chat."
                    },
                    { transaction }
                );
            }

            await transaction.commit();

            /* Tempo real: só depois de persistir. */
            const payload = {
                conversaId: id,
                mensagem: mensagem.toJSON()
            };

            emitirParaConversa(id, "mensagem:nova", payload);
            emitirParaUsuario(destinatarioId, "mensagem:nova", payload);
            emitirParaUsuario(destinatarioId, "conversa:atualizada", {
                conversaId: id
            });
            emitirParaUsuario(solicitante.id, "conversa:atualizada", {
                conversaId: id
            });

            return mensagem;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       MARCAR MENSAGENS COMO LIDAS
    ========================================================== */
    async marcarComoLidas(id, solicitante) {
        const conversa = await this.carregarConversa(id);

        this.garantirParticipante(conversa, solicitante);

        await Mensagem.update(
            { lida: true },
            {
                where: {
                    conversaId: id,
                    remetenteId: { [Op.ne]: solicitante.id },
                    lida: false
                }
            }
        );

        emitirParaConversa(id, "mensagem:lida", {
            conversaId: id,
            usuarioId: solicitante.id
        });

        return { mensagem: "Mensagens marcadas como lidas." };
    }
}

export default new ConversaService();
