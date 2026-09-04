import { Usuario } from "../models/index.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

/**
 * Registro centralizado de auditoria administrativa.
 *
 * Escreve em admin_audit_logs — tabela conceitualmente imutável (sem
 * updated_at, sem endpoint de edição/exclusão em nenhuma camada). Este
 * service só CRIA e LÊ registros; nunca os altera ou remove — e nenhuma
 * rota/controller deste projeto expõe update/delete para este recurso.
 *
 * `adminId` nunca deve vir do corpo/query da requisição: quem chama
 * (AdminEmpresaService, AdminUsuarioService, AdminConteudoService,
 * DenunciaService...) sempre resolve a partir de `solicitante.id`, que por
 * sua vez vem de `req.user` (populado pelo authMiddleware a partir do
 * token), nunca de um identificador enviado pelo frontend.
 */
class AdminAuditService {
    async log({
        adminId,
        acao,
        entidadeTipo = null,
        entidadeId = null,
        descricao = null,
        metadata = null,
        ip = null,
        userAgent = null
    }, { transaction } = {}) {
        await AdminAuditLog.create(
            {
                adminId: adminId ?? null,
                acao,
                entidadeTipo,
                entidadeId,
                descricao,
                metadata,
                ip: ip ? String(ip).slice(0, 64) : null,
                userAgent: userAgent ? String(userAgent).slice(0, 255) : null
            },
            { transaction }
        );
    }

    /**
     * Leitura paginada/filtrável — usada só pelo visualizador de logs do
     * painel administrativo (GET, somente leitura).
     */
    async listar(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};
        if (query.acao) where.acao = query.acao;
        if (query.entidadeTipo) where.entidadeTipo = query.entidadeTipo;
        if (query.entidadeId) where.entidadeId = query.entidadeId;
        if (query.adminId) where.adminId = query.adminId;

        const { rows, count } = await AdminAuditLog.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "admin",
                    attributes: ["id", "nome", "email"]
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("logs", rows, count, pagina, limite);
    }
}

export default new AdminAuditService();
