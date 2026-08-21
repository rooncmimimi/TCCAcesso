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
import { garantirDono } from "../utils/authorization.js";

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
    ========================================================== */
    async setAtivo(id, ativo) {
        const usuario = await this.buscarPorId(id);

        usuario.ativo = ativo;
        await usuario.save();

        return usuario;
    }

    async activate(id) {
        return this.setAtivo(id, true);
    }

    async deactivate(id) {
        return this.setAtivo(id, false);
    }

    /* ==========================================================
       EXCLUIR (administrador)
       O banco remove perfis/relacionamentos via ON DELETE CASCADE.
    ========================================================== */
    async delete(id) {
        const transaction = await sequelize.transaction();

        try {
            const usuario = await Usuario.findByPk(id, { transaction });

            if (!usuario) {
                throw ApiError.notFound("Usuário não encontrado.");
            }

            await usuario.destroy({ transaction });
            await transaction.commit();

            return { mensagem: "Usuário removido com sucesso." };
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }
}

export default new UsuarioService();
