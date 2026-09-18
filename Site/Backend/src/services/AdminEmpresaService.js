import { Empresa, Usuario } from "../models/index.js";
import ErroApi from "../utils/ErroApi.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";
import NotificacaoService from "./NotificacaoService.js";
import AdminAuditoriaService from "./AdminAuditoriaService.js";
import { tentarAvisarPorEmail } from "../utils/avisoEmail.js";
import { modeloEmpresaSuspensa } from "../utils/modelosEmail.js";

/**
 * Painel administrativo: aprovação, verificação e suspensão de empresas.
 *
 * Todas as rotas que chegam aqui já passaram por autenticacaoMiddleware +
 * exigirTipoUsuarioMiddleware("administrador"); ainda assim os métodos nunca
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
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("empresas", rows, count, pagina, limite);
    }

    async avaliarEmpresa(id, { aprovada, motivo }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        const statusAnterior = empresa.statusAprovacao;

        await empresa.update({
            statusAprovacao: aprovada ? "aprovada" : "reprovada",
            motivoReprovacao: aprovada ? null : motivo || null,
            // "aprovada" (checagem cadastral, libera publicar vagas) e "verificada" (selo de
            // confiança) são conceitos separados: aprovar não verifica. A verificação é uma ação
            // própria, ver `verificarEmpresa` abaixo.
            avaliadoEm: new Date(),
            avaliadoPorId: solicitante.id
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "sistema",
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

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: aprovada ? "aprovar_empresa" : "reprovar_empresa",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: aprovada
                ? `Empresa ${empresa.razaoSocial} foi aprovada.`
                : `Empresa ${empresa.razaoSocial} foi reprovada.`,
            metadados: {
                antes: { statusAprovacao: statusAnterior },
                depois: { statusAprovacao: empresa.statusAprovacao },
                motivo: aprovada ? null : motivo || null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    /**
     * Selo de confiança "Empresa verificada", independente da aprovação cadastral
     * (`statusAprovacao`), no campo `empresaVerificada`. Pode ser dado ou tirado a qualquer
     * momento, em qualquer status: uma empresa pode perder a verificação e continuar publicando
     * vagas, por exemplo.
     */
    async verificarEmpresa(id, { verificada }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        const estadoAnterior = empresa.empresaVerificada;

        await empresa.update({ empresaVerificada: Boolean(verificada) });

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: verificada ? "verificar_empresa" : "remover_verificacao_empresa",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: verificada
                ? `Empresa ${empresa.razaoSocial} recebeu o selo de verificada.`
                : `Selo de verificada removido da empresa ${empresa.razaoSocial}.`,
            metadados: {
                antes: { empresaVerificada: estadoAnterior },
                depois: { empresaVerificada: empresa.empresaVerificada }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }

    /**
     * Suspensão e reativação administrativa, sem efeito em cascata sobre as vagas da empresa. Usa
     * campos próprios (`suspensoPorId`, `suspensoEm`, `motivoSuspensao`), e não `avaliadoPorId`,
     * `avaliadoEm` e `motivoReprovacao`, que representam só a avaliação cadastral inicial.
     */
    async suspenderEmpresa(id, { motivo }, solicitante, contexto = {}) {
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        if (empresa.statusAprovacao !== "aprovada") {
            throw ErroApi.conflito(
                "Só é possível suspender uma empresa que esteja aprovada."
            );
        }

        await empresa.update({
            statusAprovacao: "suspensa",
            suspensoPorId: solicitante.id,
            suspensoEm: new Date(),
            motivoSuspensao: motivo || null
        });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "moderacao",
            titulo: "Empresa suspensa",
            descricao: `Sua empresa foi suspensa pela moderação. Motivo: ${motivo || "não informado"}.`,
            subtipo: "empresa_suspensa",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
        });

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: "suspender_empresa",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: `Empresa ${empresa.razaoSocial} foi suspensa.`,
            metadados: {
                antes: { statusAprovacao: "aprovada" },
                depois: { statusAprovacao: "suspensa" },
                motivo: motivo || null
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        // Diferente de conta bloqueada, o login da empresa continua funcionando, mas o e-mail
        // garante que ela saiba o motivo mesmo sem abrir o painel. Enviado sem garantia, depois de
        // tudo já gravado.
        const usuarioDaEmpresa = await Usuario.findByPk(empresa.usuarioId, {
            attributes: ["id", "nome", "email"]
        });
        if (usuarioDaEmpresa) {
            await tentarAvisarPorEmail({
                usuarioId: usuarioDaEmpresa.id,
                email: usuarioDaEmpresa.email,
                nome: usuarioDaEmpresa.nome,
                template: modeloEmpresaSuspensa({ nome: usuarioDaEmpresa.nome, motivo: motivo || null }),
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
            throw ErroApi.naoEncontrado("Empresa não encontrada.");
        }

        if (empresa.statusAprovacao !== "suspensa") {
            throw ErroApi.conflito(
                "Só é possível reativar uma empresa que esteja suspensa."
            );
        }

        // suspensoPorId/suspensoEm/motivoSuspensao não são apagados aqui:
        // ficam como histórico de que a empresa já foi suspensa antes,
        // mesmo padrão de motivoReprovacao sobrevivendo a uma aprovação.
        await empresa.update({ statusAprovacao: "aprovada" });

        await NotificacaoService.criar({
            usuarioId: empresa.usuarioId,
            tipo: "moderacao",
            titulo: "Empresa reativada",
            descricao: "Sua empresa foi reativada pela moderação e voltou a operar normalmente.",
            subtipo: "empresa_reativada",
            entidadeTipo: "usuario",
            entidadeId: empresa.usuarioId
        });

        await AdminAuditoriaService.registrar({
            administradorId: solicitante.id,
            acao: "reativar_empresa",
            entidadeTipo: "empresa",
            entidadeId: empresa.id,
            descricao: `Empresa ${empresa.razaoSocial} foi reativada.`,
            metadados: {
                antes: { statusAprovacao: "suspensa" },
                depois: { statusAprovacao: "aprovada" }
            },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return empresa;
    }
}

export default new AdminEmpresaService();
