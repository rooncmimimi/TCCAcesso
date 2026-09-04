import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
    Usuario,
    Candidato,
    Empresa,
    Administrador
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono, garantirAlvoDeAcaoAdministrativa } from "../utils/authorization.js";
import AdminAuditService from "./AdminAuditService.js";
import BloqueioService from "./BloqueioService.js";
import AdminUsuarioService from "./AdminUsuarioService.js";

class UsuarioService {
    async buscarPorId(id) {
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        return usuario;
    }

    /* ==========================================================
       LISTAR (somente administrador)
    ========================================================== */
    async findAll(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);
        const { nome, email, tipoUsuario, ativo } = query;

        const where = {};

        if (nome) {
            where.nome = { [Op.iLike]: `%${nome}%` };
        }

        if (email) {
            where.email = { [Op.iLike]: `%${email}%` };
        }

        if (tipoUsuario) {
            where.tipoUsuario = tipoUsuario;
        }

        if (ativo !== undefined) {
            where.ativo = ativo === "true" || ativo === true;
        }

        const { rows, count } = await Usuario.findAndCountAll({
            where,
            offset,
            limit: limite,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("usuarios", rows, count, pagina, limite);
    }

    /* ==========================================================
       BUSCAR POR ID
    ========================================================== */
    async findById(id, solicitante) {
        const usuario = await Usuario.findByPk(id, {
            include: [
                { model: Candidato, as: "candidato" },
                { model: Empresa, as: "empresa" },
                { model: Administrador, as: "administrador" }
            ]
        });

        if (!usuario) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        // Este endpoint retorna o registro completo (e-mail, telefone, CPF
        // via candidato, CNPJ via empresa) — só o dono ou um administrador
        // pode receber esses dados. Nenhum caller do frontend usa esta rota
        // hoje; a checagem existe para fechar o acesso direto via API.
        garantirDono(solicitante, usuario.id);

        return usuario;
    }

    /* ==========================================================
       PERFIL PÚBLICO BÁSICO (qualquer usuário autenticado)

       Fallback usado pela rota de perfil quando o alvo não tem registro
       em Candidato nem Empresa (hoje, só administradores) — retorna
       apenas o necessário para montar o cabeçalho do perfil público.
       Nunca inclui e-mail/telefone/documentos. Reaproveita a mesma
       checagem de bloqueio/privacidade usada pelo perfil de candidato e
       de empresa, sem duplicar a regra.
    ========================================================== */
    async perfilPublicoBasico(id, solicitante) {
        const usuario = await Usuario.findByPk(id, {
            attributes: [
                "id",
                "nome",
                "fotoPerfil",
                "capaPerfil",
                "tipoUsuario",
                "perfilPublico",
                "ativo",
                "bloqueado"
            ]
        });

        if (!usuario || !usuario.ativo) {
            throw ApiError.notFound("Usuário não encontrado.");
        }

        await BloqueioService.garantirNaoBloqueado(usuario, solicitante);

        return {
            id: usuario.id,
            nome: usuario.nome,
            fotoPerfil: usuario.fotoPerfil,
            capaPerfil: usuario.capaPerfil,
            tipoUsuario: usuario.tipoUsuario
        };
    }

    /* ==========================================================
       ATUALIZAR (dono ou administrador)

       Campos sensíveis (email, senhaHash, tipoUsuario, ativo)
       não são atualizáveis por esta rota — evita escalonamento
       de privilégio via mass assignment (OWASP A01/A08).
    ========================================================== */
    async update(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.findByPk(id, { transaction });

            if (!usuario) {
                throw ApiError.notFound("Usuário não encontrado.");
            }

            garantirDono(solicitante, usuario.id);

            // "!== undefined" (em vez de "??") permite limpar telefone/foto/capa
            // enviando null explicitamente — "??" nunca deixava isso acontecer.
            await usuario.update(
                {
                    nome: data.nome ?? usuario.nome,
                    telefone: data.telefone !== undefined ? data.telefone : usuario.telefone,
                    fotoPerfil: data.fotoPerfil !== undefined ? data.fotoPerfil : usuario.fotoPerfil,
                    capaPerfil: data.capaPerfil !== undefined ? data.capaPerfil : usuario.capaPerfil
                },
                { transaction }
            );

            await transaction.commit();

            return usuario;
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       ATIVAR / DESATIVAR (administrador)
       Rotas já restritas a administrador (rbacMiddleware); ainda assim
       aplicamos a mesma proteção ADMIN->ADMIN / auto-ação que os services
       administrativos usam (`garantirAlvoDeAcaoAdministrativa`, em
       utils/authorization.js) — nunca confie só na rota.
    ========================================================== */
    async setAtivo(id, ativo, solicitante, contexto = {}) {
        const usuario = await this.buscarPorId(id);

        garantirAlvoDeAcaoAdministrativa(usuario, solicitante, {
            mensagemAutoAcao: ativo
                ? "Você não pode reativar a própria conta por aqui."
                : "Você não pode desativar a própria conta por aqui.",
            mensagemAdminProtegido: ativo
                ? "Contas administrativas não podem ser reativadas por aqui."
                : "Contas administrativas não podem ser desativadas por aqui."
        });

        const estadoAnterior = { ativo: usuario.ativo };

        usuario.ativo = ativo;
        await usuario.save();

        await AdminAuditService.log({
            adminId: solicitante.id,
            acao: ativo ? "ATIVAR_USUARIO" : "DESATIVAR_USUARIO",
            entidadeTipo: "usuario",
            entidadeId: usuario.id,
            descricao: ativo
                ? `Usuário ${usuario.nome} (${usuario.email}) foi reativado.`
                : `Usuário ${usuario.nome} (${usuario.email}) foi desativado.`,
            metadata: { before: estadoAnterior, after: { ativo } },
            ip: contexto.ip,
            userAgent: contexto.userAgent
        });

        return usuario;
    }

    async activate(id, solicitante, contexto = {}) {
        return this.setAtivo(id, true, solicitante, contexto);
    }

    async deactivate(id, solicitante, contexto = {}) {
        return this.setAtivo(id, false, solicitante, contexto);
    }

    /* ==========================================================
       EXCLUIR (administrador)

       Fase 5: delega para `AdminUsuarioService.removerUsuario` — antes, este
       método tinha sua própria implementação, incompleta e divergente
       da exclusão feita pelo painel admin (sem limpeza do Storage, sem
       arquivar denúncias pendentes contra a conta, log de auditoria
       fora da transação de exclusão). Esta rota não tem hoje nenhum
       caller no frontend (o painel usa `/admin/usuarios/:id`), mas
       continua ativa e alcançável via API — precisa produzir exatamente
       o mesmo resultado que a exclusão administrativa "oficial".
    ========================================================== */
    async delete(id, solicitante, contexto = {}) {
        return AdminUsuarioService.removerUsuario(id, {}, solicitante, contexto);
    }
}

export default new UsuarioService();
