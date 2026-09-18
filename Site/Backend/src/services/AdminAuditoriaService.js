import { Usuario } from "../models/index.js";
import RegistroAuditoria from "../models/RegistroAuditoria.js";
import { resolverPaginacao, montarResposta } from "../utils/paginacao.js";

/**
 * Registro centralizado da auditoria administrativa, na tabela `registros_auditoria`, que é
 * imutável pela aplicação (sem `atualizado_em` e sem rota de edição ou exclusão). Este service só
 * cria e lê registros; nunca altera nem remove.
 *
 * `administradorId` nunca vem do corpo ou da query da requisição: quem chama (`AdminEmpresaService`,
 * `AdminUsuarioService`, `AdminConteudoService`, `DenunciaService`...) sempre passa
 * `solicitante.id`, que vem de `req.user`, preenchido pelo `autenticacaoMiddleware` a partir do
 * token.
 */
class AdminAuditoriaService {
    async registrar({
        administradorId,
        acao,
        entidadeTipo = null,
        entidadeId = null,
        descricao = null,
        metadados = null,
        ip = null,
        userAgent = null
    }, { transaction } = {}) {
        await RegistroAuditoria.create(
            {
                administradorId: administradorId ?? null,
                acao,
                entidadeTipo,
                entidadeId,
                descricao,
                metadados,
                ip: ip ? String(ip).slice(0, 64) : null,
                userAgent: userAgent ? String(userAgent).slice(0, 255) : null
            },
            { transaction }
        );
    }

    /**
     * Leitura paginada/filtrável, usada só pelo visualizador de logs do
     * painel administrativo (GET, somente leitura).
     */
    async listar(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = {};
        if (query.acao) where.acao = query.acao;
        if (query.entidadeTipo) where.entidadeTipo = query.entidadeTipo;
        if (query.entidadeId) where.entidadeId = query.entidadeId;
        if (query.administradorId) where.administradorId = query.administradorId;

        const { rows, count } = await RegistroAuditoria.findAndCountAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: "administrador",
                    attributes: ["id", "nome", "email"]
                }
            ],
            limit: limite,
            offset,
            order: [["criadoEm", "DESC"]]
        });

        return montarResposta("logs", rows, count, pagina, limite);
    }
}

export default new AdminAuditoriaService();
