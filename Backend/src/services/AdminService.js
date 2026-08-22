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
import { garantirAlvoDeAcaoAdministrativa } from "../utils/authorization.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";

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

    async avaliarEmpresa(id, { aprovada, motivo }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        const statusAnterior = empresa.statusAprovacao;

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

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: aprovada ? "APROVAR_EMPRESA" : "REPROVAR_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: aprovada
                ? `Empresa ${empresa.razaoSocial} foi aprovada.`
                : `Empresa ${empresa.razaoSocial} foi reprovada.`,
            metadata: {
                before: { statusAprovacao: statusAnterior },
                after: { statusAprovacao: empresa.statusAprovacao },
                reason: aprovada ? null : motivo || null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    /**
     * Suspensão/reativação administrativa (Fase G) — ação isolada, sem
     * efeito cascata sobre as vagas da empresa. Usa campos próprios
     * (suspensoPor/suspensoEm/motivoSuspensao), nunca avaliadoPor/
     * avaliadoEm/motivoReprovacao, que continuam representando só a
     * avaliação cadastral inicial.
     */
    async suspenderEmpresa(id, { motivo }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        if (empresa.statusAprovacao !== "aprovada") {
            throw ApiError.conflict(
                "Só é possível suspender uma empresa que esteja aprovada."
            );
        }

        await empresa.update({
            statusAprovacao: "suspensa",
            suspensoPor: solicitante.id,
            suspensoEm: new Date(),
            motivoSuspensao: motivo || null
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Moderacao",
            titulo: "Empresa suspensa",
            descricao: `Sua empresa foi suspensa pela moderação. Motivo: ${motivo || "não informado"}.`
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "SUSPENDER_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: `Empresa ${empresa.razaoSocial} foi suspensa.`,
            metadata: {
                before: { statusAprovacao: "aprovada" },
                after: { statusAprovacao: "suspensa" },
                reason: motivo || null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    async reativarEmpresa(id, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        if (empresa.statusAprovacao !== "suspensa") {
            throw ApiError.conflict(
                "Só é possível reativar uma empresa que esteja suspensa."
            );
        }

        // suspensoPor/suspensoEm/motivoSuspensao NÃO são apagados aqui —
        // ficam como histórico de que a empresa já foi suspensa antes,
        // mesmo padrão de motivoReprovacao sobrevivendo a uma aprovação.
        await empresa.update({ statusAprovacao: "aprovada" });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "Moderacao",
            titulo: "Empresa reativada",
            descricao: "Sua empresa foi reativada pela moderação e voltou a operar normalmente."
        });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "REATIVAR_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: `Empresa ${empresa.razaoSocial} foi reativada.`,
            metadata: {
                before: { statusAprovacao: "suspensa" },
                after: { statusAprovacao: "aprovada" }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
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

    /**
     * Localiza o usuário-alvo de uma ação administrativa restritiva
     * (bloqueio, exclusão etc.), aplicando as duas proteções obrigatórias:
     * o admin não pode agir contra a própria conta, nem contra outra
     * conta administrativa. Centralizado aqui para que toda ação
     * restritiva/destrutiva reutilize a mesma regra em vez de duplicá-la.
     */
    async resolverUsuarioModeravel(
        id,
        solicitante,
        { mensagemAutoAcao, mensagemAdminProtegido }
    ) {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        garantirAlvoDeAcaoAdministrativa(usuario, solicitante, {
            mensagemAutoAcao,
            mensagemAdminProtegido
        });

        return usuario;
    }

    async alternarBloqueio(id, { bloqueado, motivo }, solicitante, contexto = {}) {
        const usuario = await this.resolverUsuarioModeravel(id, solicitante, {
            mensagemAutoAcao: "Você não pode bloquear a própria conta.",
            mensagemAdminProtegido:
                "Contas administrativas não podem ser bloqueadas por aqui."
        });

        const estadoAnterior = {
            bloqueado: usuario.bloqueado,
            ativo: usuario.ativo
        };

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

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: novoEstado ? "BLOQUEAR_USUARIO" : "REATIVAR_USUARIO",
            entidadeTipo: "usuario",
            entidadeId: usuario.id,
            descricao: novoEstado
                ? `Usuário ${usuario.nome} (${usuario.email}) foi bloqueado.`
                : `Usuário ${usuario.nome} (${usuario.email}) foi reativado.`,
            metadata: {
                before: estadoAnterior,
                after: { bloqueado: novoEstado, ativo: !novoEstado },
                reason: novoEstado ? motivo || null : null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return {
            id: usuario.id,
            bloqueado: usuario.bloqueado,
            ativo: usuario.ativo
        };
    }

    async removerUsuario(id, solicitante, contexto = {}) {
        const usuario = await this.resolverUsuarioModeravel(id, solicitante, {
            mensagemAutoAcao: "Você não pode excluir a própria conta.",
            mensagemAdminProtegido:
                "Contas administrativas não podem ser excluídas por aqui."
        });

        const dadosRemovidos = {
            tipoUsuario: usuario.tipoUsuario,
            nome: usuario.nome,
            email: usuario.email
        };

        await usuario.destroy();

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "EXCLUIR_USUARIO",
            entidadeTipo: "usuario",
            entidadeId: id,
            descricao: `Usuário ${dadosRemovidos.nome} (${dadosRemovidos.email}) foi excluído permanentemente.`,
            metadata: { usuario: dadosRemovidos },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

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

    async listarComentarios(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};
        if (query.postagemId) where.postagemId = query.postagemId;

        const { rows, count } = await Comentario.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "email", "tipoUsuario"]
                },
                {
                    model: Postagem,
                    as: "postagem",
                    attributes: ["id", "conteudo"]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("comentarios", rows, count, pagina, limite);
    }

    async removerPostagem(id, solicitante, contexto = {}) {
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

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "REMOVER_POSTAGEM",
            entidadeTipo: "postagem",
            entidadeId: postagem.id,
            descricao: "Postagem removida pela moderação.",
            metadata: {
                before: { ativo: true },
                after: { ativo: false },
                autorId: postagem.usuarioId
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return { mensagem: "Postagem removida pela moderação." };
    }

    async removerComentario(id, solicitante, contexto = {}) {
        const comentario = await Comentario.findByPk(id);

        if (!comentario) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        await comentario.update({ ativo: false });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: "REMOVER_COMENTARIO",
            entidadeTipo: "comentario",
            entidadeId: comentario.id,
            descricao: "Comentário removido pela moderação.",
            metadata: {
                before: { ativo: true },
                after: { ativo: false },
                autorId: comentario.usuarioId
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

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

    async alternarVisibilidadeVaga(id, oculta, solicitante, contexto = {}) {
        const vaga = await Vaga.findByPk(id);

        if (!vaga) {
            throw ApiError.notFound("Vaga não encontrada.");
        }

        const estadoAnterior = { oculta: vaga.oculta };
        const novoOculta = Boolean(oculta);

        await vaga.update({ oculta: novoOculta });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: novoOculta ? "OCULTAR_VAGA" : "REEXIBIR_VAGA",
            entidadeTipo: "vaga",
            entidadeId: vaga.id,
            descricao: novoOculta
                ? `Vaga "${vaga.titulo}" foi ocultada pela moderação.`
                : `Vaga "${vaga.titulo}" voltou a ficar visível.`,
            metadata: {
                before: estadoAnterior,
                after: { oculta: novoOculta }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

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
