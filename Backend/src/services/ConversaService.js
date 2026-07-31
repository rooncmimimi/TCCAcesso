import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Conversa,
    Mensagem,
    Candidato,
    Empresa,
    Usuario,
    Notificacao
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

const INCLUDE_PARTICIPANTES = [
    {
        model: Candidato,
        as: "candidato",
        include: [
            {
                model: Usuario,
                as: "usuario",
                attributes: ["id", "nome", "fotoPerfil"]
            }
        ]
    },
    {
        model: Empresa,
        as: "empresa",
        attributes: ["id", "usuarioId", "nomeFantasia", "razaoSocial", "logo"]
    }
];

/**
 * Chat 1:1 entre candidato e empresa.
 *
 * Toda leitura/escrita valida se o usuário autenticado é um dos dois
 * participantes da conversa (proteção contra IDOR — OWASP A01).
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
        const usuarios = [
            conversa.candidato?.usuarioId,
            conversa.empresa?.usuarioId
        ];

        if (!usuarios.includes(solicitante.id)) {
            throw ApiError.forbidden("Você não participa desta conversa.");
        }
    }

    /* ==========================================================
       ABRIR / RECUPERAR CONVERSA
    ========================================================== */
    async abrir({ candidatoId, empresaId }, solicitante) {
        let candidato = null;
        let empresa = null;

        if (solicitante.tipoUsuario === "candidato") {
            candidato = await Candidato.findOne({
                where: { usuarioId: solicitante.id }
            });
            empresa = await Empresa.findByPk(empresaId);
        } else if (solicitante.tipoUsuario === "empresa") {
            empresa = await Empresa.findOne({
                where: { usuarioId: solicitante.id }
            });
            candidato = await Candidato.findByPk(candidatoId);
        } else {
            throw ApiError.forbidden(
                "Apenas candidatos e empresas podem iniciar conversas."
            );
        }

        if (!candidato || !empresa) {
            throw ApiError.notFound("Participante da conversa não encontrado.");
        }

        const [conversa] = await Conversa.findOrCreate({
            where: { candidatoId: candidato.id, empresaId: empresa.id },
            defaults: { ultimaMensagem: new Date() }
        });

        return this.carregarConversa(conversa.id);
    }

    /* ==========================================================
       LISTAR CONVERSAS DO USUÁRIO
    ========================================================== */
    async listar(solicitante, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const candidato = await Candidato.findOne({
            where: { usuarioId: solicitante.id }
        });
        const empresa = await Empresa.findOne({
            where: { usuarioId: solicitante.id }
        });

        const filtros = [];

        if (candidato) filtros.push({ candidatoId: candidato.id });
        if (empresa) filtros.push({ empresaId: empresa.id });

        if (filtros.length === 0) {
            return montarResposta("conversas", [], 0, pagina, limite);
        }

        const { rows, count } = await Conversa.findAndCountAll({
            where: { [Op.or]: filtros },
            include: INCLUDE_PARTICIPANTES,
            limit: limite,
            offset,
            distinct: true,
            order: [["ultima_mensagem", "DESC NULLS LAST"]]
        });

        return montarResposta("conversas", rows, count, pagina, limite);
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
                conversa.candidato.usuarioId === solicitante.id
                    ? conversa.empresa.usuarioId
                    : conversa.candidato.usuarioId;

            await Notificacao.create(
                {
                    usuarioId: destinatarioId,
                    tipo: "Mensagem",
                    titulo: "Nova mensagem recebida",
                    descricao: "Você recebeu uma nova mensagem no chat."
                },
                { transaction }
            );

            await transaction.commit();

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

        return { mensagem: "Mensagens marcadas como lidas." };
    }
}

export default new ConversaService();
