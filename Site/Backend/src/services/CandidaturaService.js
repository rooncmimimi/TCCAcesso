import sequelize from "../config/database.js";
import {
    Candidatura,
    Vaga,
    Empresa,
    Candidato,
    Usuario
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import {
    ehAdministrador,
    garantirEmpresaAprovada,
    garantirVagaDisponivelParaCandidatura
} from "../utils/authorization.js";
import { STATUS_CANDIDATURA } from "../models/Candidatura.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

/** Status que somente a empresa dona da vaga pode aplicar. */
const STATUS_EMPRESA = ["Visualizada", "EmAnalise", "Aprovada", "Rejeitada"];

/** Texto por extenso de cada status — usado nas notificações. */
const ROTULO_STATUS_CANDIDATURA = {
    Pendente: "Pendente",
    Visualizada: "Visualizada",
    EmAnalise: "Em análise",
    Aprovada: "Aprovada",
    Rejeitada: "Rejeitada",
    Cancelada: "Cancelada"
};

class CandidaturaService {
    async candidatoDoUsuario(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ApiError.forbidden(
                "Apenas candidatos com perfil podem se candidatar."
            );
        }

        return candidato;
    }

    async empresaDoUsuario(usuarioId) {
        const empresa = await Empresa.findOne({ where: { usuarioId } });

        if (!empresa) {
            throw ApiError.forbidden("Perfil de empresa não encontrado.");
        }

        return empresa;
    }

    /* ==========================================================
       CANDIDATAR-SE
    ========================================================== */
    async create(vagaId, mensagem, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const transaction = await sequelize.transaction();

        try {
            const vaga = await Vaga.findByPk(vagaId, {
                include: [{ model: Empresa, as: "empresa" }],
                transaction
            });

            if (!vaga) {
                throw ApiError.notFound("Vaga não encontrada.");
            }

            // Fase 9: empresa suspensa/reprovada/pendente não pode receber
            // NOVAS candidaturas, mesmo que a vaga em si ainda esteja com
            // status "Aberta" (suspender a empresa não altera o status de
            // cada vaga uma a uma) — checagem por terceiro, nunca a mensagem
            // usada quando é a própria empresa agindo.
            garantirVagaDisponivelParaCandidatura(vaga.empresa);

            // Fase 9 (Bloco 2): bloqueio candidato↔empresa, em qualquer
            // sentido — reaproveita o MESMO `UsuarioBloqueio` já usado para
            // usuário↔usuário (a empresa não é uma entidade separada,
            // seu bloqueio é o do próprio `Usuario` dela). Mensagem
            // genérica, nunca revela que o motivo é bloqueio.
            if (
                await BloqueioService.estaBloqueadoEntre(
                    solicitante.id,
                    vaga.empresa.usuarioId
                )
            ) {
                throw ApiError.forbidden(
                    "Não é possível se candidatar a esta vaga."
                );
            }

            if (vaga.status !== "Aberta") {
                throw ApiError.badRequest(
                    "Esta vaga não está aberta para candidaturas."
                );
            }

            const jaExiste = await Candidatura.findOne({
                where: { vagaId, candidatoId: candidato.id },
                transaction
            });

            if (jaExiste) {
                throw ApiError.conflict("Você já se candidatou a esta vaga.");
            }

            const candidatura = await Candidatura.create(
                {
                    vagaId,
                    candidatoId: candidato.id,
                    mensagem: mensagem || null,
                    status: "Pendente",
                    dataCandidatura: new Date()
                },
                { transaction }
            );

            const notificacao = await NotificacaoService.criar(
                {
                    usuarioId: vaga.empresa.usuarioId,
                    tipo: "Candidatura",
                    titulo: "Nova candidatura recebida",
                    descricao: `${solicitante.nome} se candidatou à vaga "${vaga.titulo}".`,
                    subtipo: "candidatura_recebida",
                    entidadeTipo: "vaga",
                    entidadeId: vaga.id,
                    atorId: solicitante.id
                },
                { transaction }
            );

            await transaction.commit();

            if (notificacao) {
                NotificacaoService.emitirNotificacaoCriada(
                    notificacao,
                    await NotificacaoService.contarNaoLidasDe(vaga.empresa.usuarioId)
                );
            }

            return candidatura;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       MINHAS CANDIDATURAS (candidato)
    ========================================================== */
    async listarDoCandidato(solicitante, query) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { candidatoId: candidato.id };

        if (query.status) {
            where.status = query.status;
        }

        const { rows, count } = await Candidatura.findAndCountAll({
            where,
            include: [
                {
                    model: Vaga,
                    as: "vaga",
                    include: [
                        {
                            model: Empresa,
                            as: "empresa",
                            attributes: ["id", "nomeFantasia", "razaoSocial", "logo"]
                        }
                    ]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["data_candidatura", "DESC"]]
        });

        return montarResposta("candidaturas", rows, count, pagina, limite);
    }

    /* ==========================================================
       CANDIDATURAS DE UMA VAGA (empresa dona)
    ========================================================== */
    async listarDaVaga(vagaId, solicitante, query) {
        const vaga = await Vaga.findByPk(vagaId, {
            include: [{ model: Empresa, as: "empresa" }]
        });

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        if (
            !ehAdministrador(solicitante) &&
            vaga.empresa.usuarioId !== solicitante.id
        ) {
            throw ApiError.forbidden(
                "Você não tem permissão para ver as candidaturas desta vaga."
            );
        }

        garantirEmpresaAprovada(vaga.empresa, solicitante);

        const { pagina, limite, offset } = resolverPaginacao(query);
        const where = { vagaId };

        if (query.status) {
            where.status = query.status;
        }

        const { rows, count } = await Candidatura.findAndCountAll({
            where,
            include: [
                {
                    model: Candidato,
                    as: "candidato",
                    include: [
                        {
                            model: Usuario,
                            as: "usuario",
                            attributes: ["id", "nome", "email", "fotoPerfil"]
                        }
                    ]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["data_candidatura", "DESC"]]
        });

        return montarResposta("candidaturas", rows, count, pagina, limite);
    }

    /* ==========================================================
       DETALHE (candidato dono, empresa dona ou admin)
    ========================================================== */
    async findById(id, solicitante) {
        const candidatura = await Candidatura.findByPk(id, {
            include: [
                {
                    model: Vaga,
                    as: "vaga",
                    include: [{ model: Empresa, as: "empresa" }]
                },
                {
                    model: Candidato,
                    as: "candidato",
                    include: [
                        {
                            model: Usuario,
                            as: "usuario",
                            attributes: ["id", "nome", "email", "fotoPerfil"]
                        }
                    ]
                }
            ]
        });

        if (!candidatura) {
            throw ApiError.notFound("Candidatura não encontrada.");
        }

        const ehDonoCandidato =
            candidatura.candidato?.usuarioId === solicitante.id;
        const ehDonoEmpresa =
            candidatura.vaga?.empresa?.usuarioId === solicitante.id;

        if (!ehAdministrador(solicitante) && !ehDonoCandidato && !ehDonoEmpresa) {
            throw ApiError.forbidden("Acesso negado a esta candidatura.");
        }

        return candidatura;
    }

    /* ==========================================================
       ATUALIZAR STATUS (empresa dona)
    ========================================================== */
    async atualizarStatus(id, status, solicitante) {
        if (!STATUS_CANDIDATURA.includes(status)) {
            throw ApiError.badRequest("Status de candidatura inválido.");
        }

        const transaction = await sequelize.transaction();

        try {
            const candidatura = await Candidatura.findByPk(id, {
                include: [
                    {
                        model: Vaga,
                        as: "vaga",
                        include: [{ model: Empresa, as: "empresa" }]
                    },
                    { model: Candidato, as: "candidato" }
                ],
                transaction
            });

            if (!candidatura) {
                throw ApiError.notFound("Candidatura não encontrada.");
            }

            const ehDonoEmpresa =
                candidatura.vaga?.empresa?.usuarioId === solicitante.id;

            if (!ehAdministrador(solicitante) && !ehDonoEmpresa) {
                throw ApiError.forbidden(
                    "Apenas a empresa dona da vaga pode alterar o status."
                );
            }

            garantirEmpresaAprovada(candidatura.vaga.empresa, solicitante);

            if (!STATUS_EMPRESA.includes(status) && !ehAdministrador(solicitante)) {
                throw ApiError.badRequest(
                    "A empresa não pode aplicar este status."
                );
            }

            await candidatura.update({ status }, { transaction });

            const notificacao = await NotificacaoService.criar(
                {
                    usuarioId: candidatura.candidato.usuarioId,
                    tipo: "Candidatura",
                    titulo: "Sua candidatura foi atualizada",
                    descricao: `Sua candidatura para a vaga "${candidatura.vaga.titulo}" foi atualizada para ${ROTULO_STATUS_CANDIDATURA[status] ?? status}.`,
                    subtipo: "candidatura_atualizada",
                    entidadeTipo: "vaga",
                    entidadeId: candidatura.vaga.id,
                    atorId: solicitante.id
                },
                { transaction }
            );

            await transaction.commit();

            if (notificacao) {
                NotificacaoService.emitirNotificacaoCriada(
                    notificacao,
                    await NotificacaoService.contarNaoLidasDe(candidatura.candidato.usuarioId)
                );
            }

            return candidatura;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       CANCELAR (candidato dono)
    ========================================================== */
    async cancelar(id, solicitante) {
        const candidatura = await Candidatura.findByPk(id, {
            include: [{ model: Candidato, as: "candidato" }]
        });

        if (!candidatura) {
            throw ApiError.notFound("Candidatura não encontrada.");
        }

        if (
            !ehAdministrador(solicitante) &&
            candidatura.candidato.usuarioId !== solicitante.id
        ) {
            throw ApiError.forbidden(
                "Você só pode cancelar as suas próprias candidaturas."
            );
        }

        candidatura.status = "Cancelada";
        await candidatura.save();

        return candidatura;
    }
}

export default new CandidaturaService();
