import { Empresa, Usuario } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditService from "./AdminAuditService.js";
import { avisarPorEmailBestEffort } from "../utils/avisoEmailBestEffort.js";
import { templateEmpresaSuspensa } from "../utils/emailTemplates.js";

/**
 * Painel administrativo — aprovação, verificação e suspensão de empresas.
 *
 * Todas as rotas que chegam aqui já passaram por authMiddleware +
 * rbacMiddleware("administrador"); ainda assim os métodos nunca
 * confiam em identificadores do corpo da requisição para escalonar
 * privilégios (defesa em profundidade).
 */
class AdminEmpresaService {
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
            // "Aprovada" (checagem cadastral, libera publicar vaga) e
            // "verificada" (selo de confiança adicional) são conceitos
            // deliberadamente separados agora — aprovar não verifica mais
            // automaticamente. Verificação é uma ação administrativa
            // própria, ver `verificarEmpresa` abaixo.
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
                : `Seu cadastro foi reprovado. Motivo: ${motivo || "não informado"}.`,
            subtipo: aprovada ? "empresa_aprovada" : "empresa_reprovada",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
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
     * Selo de confiança "Empresa verificada" — independente da aprovação
     * cadastral (`statusAprovacao`). Reaproveita o campo `empresaVerificada`
     * que já existe no schema; não precisa de migration. Pode ser
     * concedido ou removido a qualquer momento, em qualquer status de
     * aprovação (uma empresa pode perder a verificação sem deixar de
     * poder publicar vagas, por exemplo).
     */
    async verificarEmpresa(id, { verificada }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ApiError.notFound("Empresa não encontrada.");
        }

        const estadoAnterior = empresa.empresaVerificada;

        await empresa.update({ empresaVerificada: Boolean(verificada) });

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: verificada ? "VERIFICAR_EMPRESA" : "REMOVER_VERIFICACAO_EMPRESA",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: verificada
                ? `Empresa ${empresa.razaoSocial} recebeu o selo de verificada.`
                : `Selo de verificada removido da empresa ${empresa.razaoSocial}.`,
            metadata: {
                before: { empresaVerificada: estadoAnterior },
                after: { empresaVerificada: empresa.empresaVerificada }
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
            descricao: `Sua empresa foi suspensa pela moderação. Motivo: ${motivo || "não informado"}.`,
            subtipo: "empresa_suspensa",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
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

        // Fase 9 (Bloco 3): diferente de conta bloqueada, o login da
        // empresa continua funcionando — mas o e-mail garante que ela
        // saiba do motivo mesmo sem abrir o painel. Best-effort, depois de
        // tudo já persistido.
        const usuarioDaEmpresa = await Usuario.findByPk(empresa.usuarioId, {
            attributes: ["id", "nome", "email"]
        });
        if (usuarioDaEmpresa) {
            await avisarPorEmailBestEffort({
                usuarioId: usuarioDaEmpresa.id,
                email: usuarioDaEmpresa.email,
                nome: usuarioDaEmpresa.nome,
                template: templateEmpresaSuspensa({ nome: usuarioDaEmpresa.nome, motivo: motivo || null }),
                tag: "empresa-suspensa",
                acao: "aviso_empresa_suspensa",
                servico: "AdminEmpresaService"
            });
        }

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
            descricao: "Sua empresa foi reativada pela moderação e voltou a operar normalmente.",
            subtipo: "empresa_reativada",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
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
}

export default new AdminEmpresaService();
