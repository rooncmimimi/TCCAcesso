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
    async findById(id) {
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

        return usuario;
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
       aplicamos a mesma proteção ADMIN->ADMIN / auto-ação do AdminService,
       via helper compartilhado — nunca confie só na rota.
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
       O banco remove perfis/relacionamentos via ON DELETE CASCADE.
    ========================================================== */
    async delete(id, solicitante, contexto = {}) {
        const transaction = await sequelize.transaction();
        let dadosRemovidos;

        try {
            const usuario = await Usuario.findByPk(id, { transaction });

            if (!usuario) {
                throw ApiError.notFound("Usuário não encontrado.");
            }

            garantirAlvoDeAcaoAdministrativa(usuario, solicitante, {
                mensagemAutoAcao: "Você não pode excluir a própria conta.",
                mensagemAdminProtegido:
                    "Contas administrativas não podem ser excluídas por aqui."
            });

            dadosRemovidos = {
                tipoUsuario: usuario.tipoUsuario,
                nome: usuario.nome,
                email: usuario.email
            };

            await usuario.destroy({ transaction });
            await transaction.commit();
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }

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

        return { mensagem: "Usuário removido com sucesso." };
    }
}

export default new UsuarioService();
