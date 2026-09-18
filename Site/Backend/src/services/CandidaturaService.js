import sequelize from "../config/bancoDeDados.js";
import {
    Candidatura,
    Vaga,
    Empresa,
    Candidato,
    Usuario
} from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import {
    ehAdministrador,
    garantirDono,
    garantirEmpresaAprovada,
    garantirVagaDisponivelParaCandidatura
} from "../utils/autorizacao.js";
import { STATUS_CANDIDATURA } from "../models/Candidatura.js";
import NotificacaoService from "./NotificacaoService.js";
import BloqueioService from "./BloqueioService.js";

/** Status que somente a empresa dona da vaga pode aplicar. */
const STATUS_EMPRESA = ["visualizada", "em_analise", "aprovada", "rejeitada"];

/** Texto por extenso de cada status: usado nas notificações. */
const ROTULO_STATUS_CANDIDATURA = {
    pendente: "Pendente",
    visualizada: "Visualizada",
    em_analise: "Em análise",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada"
};

/**
 * Candidaturas a vagas: o candidato se candidata e cancela; a empresa dona da vaga lista as
 * candidaturas e muda o status (`STATUS_EMPRESA`), o que também notifica o candidato.
 */
class CandidaturaService {
    async candidatoDoUsuario(usuarioId) {
        const candidato = await Candidato.findOne({ where: { usuarioId } });

        if (!candidato) {
            throw ErroApi.acessoNegado(
                "Apenas candidatos com perfil podem se candidatar."
            );
        }

        return candidato;
    }

    async empresaDoUsuario(usuarioId) {
        const empresa = await Empresa.findOne({ where: { usuarioId } });

        if (!empresa) {
            throw ErroApi.acessoNegado("Perfil de empresa não encontrado.");
        }

        return empresa;
    }

    /* Candidatar-se */
    async criar(vagaId, mensagem, solicitante) {
        const candidato = await this.candidatoDoUsuario(solicitante.id);
        const transaction = await sequelize.transaction();

        try {
            const vaga = await Vaga.findByPk(vagaId, {
                include: [{ model: Empresa, as: "empresa" }],
                transaction
            });

            if (!vaga) {
                throw ErroApi.naoEncontrado("Vaga não encontrada.");
            }

            // Empresa suspensa, reprovada ou pendente não recebe candidaturas novas, mesmo com a
            // vaga ainda "aberta" (suspender a empresa não muda o status de cada vaga). É a
            // checagem feita para terceiros, com mensagem diferente da usada quando a própria
            // empresa age.
            garantirVagaDisponivelParaCandidatura(vaga.empresa);

            // Bloqueio entre candidato e empresa, em qualquer sentido, com o mesmo
            // `UsuarioBloqueado` de usuário para usuário (o bloqueio da empresa é o do `Usuario`
            // dela). A mensagem é genérica e não revela que o motivo é bloqueio.
            if (
                await BloqueioService.estaBloqueadoEntre(
                    solicitante.id,
                    vaga.empresa.usuarioId
                )
            ) {
                throw ErroApi.acessoNegado(
                    "Não é possível se candidatar a esta vaga."
                );
            }

            if (vaga.status !== "aberta") {
                throw ErroApi.requisicaoInvalida(
                    "Esta vaga não está aberta para candidaturas."
                );
            }

            const jaExiste = await Candidatura.findOne({
                where: { vagaId, candidatoId: candidato.id },
                transaction
            });

            if (jaExiste) {
                throw ErroApi.conflito("Você já se candidatou a esta vaga.");
            }

            const candidatura = await Candidatura.create(
                {
                    vagaId,
                    candidatoId: candidato.id,
                    mensagem: mensagem || null,
                    status: "pendente"
                },
                { transaction }
            );

            const notificacao = await NotificacaoService.criar(
                {
                    usuarioId: vaga.empresa.usuarioId,
                    tipo: "candidatura",
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

    /* Minhas candidaturas (candidato) */
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
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("candidaturas", rows, count, pagina, limite);
    }

    /* Candidaturas de uma vaga (empresa dona) */
    async listarDaVaga(vagaId, solicitante, query) {
        const vaga = await Vaga.findByPk(vagaId, {
            include: [{ model: Empresa, as: "empresa" }]
        });

        if (!vaga) {
            throw ErroApi.naoEncontrado("Vaga não encontrada.");
        }

        garantirDono(
            solicitante,
            vaga.empresa.usuarioId,
            "Você não tem permissão para ver as candidaturas desta vaga."
        );

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
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("candidaturas", rows, count, pagina, limite);
    }

    /* Detalhe (candidato dono, empresa dona ou administrador) */
    async buscarPorId(id, solicitante) {
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
            throw ErroApi.naoEncontrado("Candidatura não encontrada.");
        }

        const ehDonoCandidato =
            candidatura.candidato?.usuarioId === solicitante.id;
        const ehDonoEmpresa =
            candidatura.vaga?.empresa?.usuarioId === solicitante.id;

        if (!ehAdministrador(solicitante) && !ehDonoCandidato && !ehDonoEmpresa) {
            throw ErroApi.acessoNegado("Acesso negado a esta candidatura.");
        }

        return candidatura;
    }

    /* Atualizar status (empresa dona) */
    async atualizarStatus(id, status, solicitante) {
        if (!STATUS_CANDIDATURA.includes(status)) {
            throw ErroApi.requisicaoInvalida("Status de candidatura inválido.");
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
                throw ErroApi.naoEncontrado("Candidatura não encontrada.");
            }

            garantirDono(
                solicitante,
                candidatura.vaga?.empresa?.usuarioId,
                "Apenas a empresa dona da vaga pode alterar o status."
            );

            garantirEmpresaAprovada(candidatura.vaga.empresa, solicitante);

            if (!STATUS_EMPRESA.includes(status) && !ehAdministrador(solicitante)) {
                throw ErroApi.requisicaoInvalida(
                    "A empresa não pode aplicar este status."
                );
            }

            await candidatura.update({ status }, { transaction });

            const notificacao = await NotificacaoService.criar(
                {
                    usuarioId: candidatura.candidato.usuarioId,
                    tipo: "candidatura",
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

    /* Cancelar (candidato dono) */
    async cancelar(id, solicitante) {
        const candidatura = await Candidatura.findByPk(id, {
            include: [{ model: Candidato, as: "candidato" }]
        });

        if (!candidatura) {
            throw ErroApi.naoEncontrado("Candidatura não encontrada.");
        }

        garantirDono(
            solicitante,
            candidatura.candidato.usuarioId,
            "Você só pode cancelar as suas próprias candidaturas."
        );

        candidatura.status = "cancelada";
        await candidatura.save();

        return candidatura;
    }
}

export default new CandidaturaService();
