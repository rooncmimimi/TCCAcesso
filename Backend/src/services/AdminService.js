import { Op, fn, col, literal } from "sequelize";

import {
    Usuario,
    Empresa,
    Candidato,
    Vaga,
    Candidatura,
    Postagem,
    Comentario,
    Deficiencia,
    CandidatoDeficiencia
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import NotificacaoService from "./NotificacaoService.js";

/**
 * Painel administrativo.
 *
 * Todas as rotas que chegam aqui já passaram por authMiddleware +
 * rbacMiddleware("administrador"); ainda assim os métodos nunca
 * confiam em identificadores do corpo da requisição para escalonar
 * privilégios (defesa em profundidade).
 */
class AdminService {
    /* ==========================================================
       EMPRESAS — APROVAÇÃO
    ========================================================== */
    async listarEmpresas(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};

        if (query.status) {
            where.statusAprovacao = query.status;
        }

        const { rows, count } = await Empresa.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "ativo", "bloqueado"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }

    async avaliarEmpresa(id, { aprovada, motivo }, solicitante) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        await empresa.update({
            statusAprovacao: aprovada ? "aprovada" : "reprovada",
            motivoReprovacao: aprovada ? null : motivo || null,
            empresaVerificada: Boolean(aprovada),
            avaliadoEm: new Date(),
            avaliadoPor: solicitante.id
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Sistema",
            titulo: aprovada
                ? "Cadastro aprovado"
                : "Cadastro reprovado",
            descricao: aprovada
                ? "Sua empresa foi aprovada e já pode publicar vagas."
                : `Seu cadastro foi reprovado. Motivo: ${motivo || "não informado"}.`
        });

        return empresa;
    }

    /* ==========================================================
       USUÁRIOS — MODERAÇÃO
    ========================================================== */
    async listarUsuarios(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};

        if (query.tipo) {
            where.tipoUsuario = query.tipo;
        }

        if (query.bloqueado !== undefined) {
            where.bloqueado = query.bloqueado === "true";
        }

        if (query.q) {
            const termo = `%${String(query.q).slice(0, 120)}%`;

            where[Op.or] = [
                { nome: { [Op.iLike]: termo } },
                { email: { [Op.iLike]: termo } }
            ];
        }

        const { rows, count } = await Usuario.findAndCountAll({
            where,
            attributes: {
                exclude: ["senhaHash"]
            },
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("usuarios", rows, count, pagina, limite);
    }

    async alternarBloqueio(id, { bloqueado, motivo }, solicitante) {
        if (String(id) === String(solicitante.id)) {
            throw ApiError.badRequest(
                "Você não pode bloquear a própria conta."
            );
        }

        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        if (usuario.tipoUsuario === "administrador") {
            throw ApiError.forbidden(
                "Contas administrativas não podem ser bloqueadas por aqui."
            );
        }

        const novoEstado =
            bloqueado === undefined ? !usuario.bloqueado : Boolean(bloqueado);

        await usuario.update({
            bloqueado: novoEstado,
            bloqueadoEm: novoEstado ? new Date() : null,
            motivoBloqueio: novoEstado ? motivo || null : null,
            ativo: !novoEstado
        });

        await NotificacaoService.criar({
            usuarioId: usuario.id,
            tipo: "Sistema",
            titulo: novoEstado ? "Conta bloqueada" : "Conta reativada",
            descricao: novoEstado
                ? `Sua conta foi bloqueada. Motivo: ${motivo || "não informado"}.`
                : "Sua conta foi reativada pela moderação."
        });

        return {
            id: usuario.id,
            bloqueado: usuario.bloqueado,
            ativo: usuario.ativo
        };
    }

    async removerUsuario(id, solicitante) {
        if (String(id) === String(solicitante.id)) {
            throw ApiError.badRequest("Você não pode excluir a própria conta.");
        }

        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        await usuario.destroy();

        return { mensagem: "Usuário removido definitivamente." };
    }

    /* ==========================================================
       MODERAÇÃO DE CONTEÚDO
    ========================================================== */
    async listarPostagens(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Postagem.findAndCountAll({
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "tipoUsuario"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("postagens", rows, count, pagina, limite);
    }

    async removerPostagem(id) {
        const postagem = await Postagem.findByPk(id);

        if (!postagem) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        await postagem.update({ ativo: false });

        await NotificacaoService.criar({
            usuarioId: postagem.usuarioId,
            tipo: "Feed",
            titulo: "Publicação removida",
            descricao:
                "Sua publicação foi removida pela moderação por violar as diretrizes da comunidade."
        });

        return { mensagem: "Postagem removida pela moderação." };
    }

    async removerComentario(id) {
        const comentario = await Comentario.findByPk(id);

        if (!comentario) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        await comentario.update({ ativo: false });

        return { mensagem: "Comentário removido pela moderação." };
    }

    async listarVagas(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Vaga.findAndCountAll({
            include: [
                {
                    model: Empresa,
                    as: "empresa",
                    attributes: ["id", "nomeFantasia", "statusAprovacao"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("vagas", rows, count, pagina, limite);
    }

    async alternarVisibilidadeVaga(id, oculta) {
        const vaga = await Vaga.findByPk(id);

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        await vaga.update({ oculta: Boolean(oculta) });

        return { id: vaga.id, oculta: vaga.oculta };
    }

    /* ==========================================================
       RELATÓRIOS
    ========================================================== */
    async relatorios() {
        const [
            totalUsuarios,
            totalCandidatos,
            totalEmpresas,
            empresasPendentes,
            totalVagas,
            vagasAbertas,
            totalCandidaturas,
            totalPostagens,
            usuariosBloqueados
        ] = await Promise.all([
            Usuario.count(),
            Usuario.count({ where: { tipoUsuario: "candidato" } }),
            Usuario.count({ where: { tipoUsuario: "empresa" } }),
            Empresa.count({ where: { statusAprovacao: "pendente" } }),
            Vaga.count(),
            Vaga.count({ where: { status: "Aberta" } }),
            Candidatura.count(),
            Postagem.count({ where: { ativo: true } }),
            Usuario.count({ where: { bloqueado: true } })
        ]);

        const candidaturasPorStatus = await Candidatura.findAll({
            attributes: ["status", [fn("COUNT", col("id")), "total"]],
            group: ["status"]
        });

        const cadastrosPorMes = await Usuario.findAll({
            attributes: [
                [fn("TO_CHAR", col("created_at"), "YYYY-MM"), "mes"],
                [fn("COUNT", col("id")), "total"]
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("NOW() - INTERVAL '12 months'")
                }
            },

            group: [literal("1")],
            order: [literal("1 ASC")]
        });

        const deficienciasMaisComuns = await CandidatoDeficiencia.findAll({
            attributes: [
                "deficienciaId",
                [fn("COUNT", col("CandidatoDeficiencia.id")), "total"]
            ],
            include: [
                {
                    model: Deficiencia,
                    as: "deficiencia",
                    attributes: ["nome", "descricao"]
                }
            ],
            group: ["CandidatoDeficiencia.deficiencia_id", "deficiencia.id"],
            order: [[literal("total"), "DESC"]],
            limit: 10
        });

        const taxaContratacao = await Candidatura.count({
            where: { status: "Aprovada" }
        });

        return {
            totais: {
                usuarios: totalUsuarios,
                candidatos: totalCandidatos,
                empresas: totalEmpresas,
                empresasPendentes,
                vagas: totalVagas,
                vagasAbertas,
                candidaturas: totalCandidaturas,
                postagens: totalPostagens,
                usuariosBloqueados,
                contratacoes: taxaContratacao
            },
            candidaturasPorStatus,
            cadastrosPorMes,
            deficienciasMaisComuns,
            atualizadoEm: new Date().toISOString()
        };
    }
}

export default new AdminService();
