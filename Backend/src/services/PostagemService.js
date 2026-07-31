import sequelize from "../config/database.js";
import { Postagem, Usuario, Comentario, Curtida } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono } from "../utils/authorization.js";

const INCLUDE_AUTOR = {
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
};

class PostagemService {
    async buscarAtiva(id, transaction) {
        const postagem = await Postagem.findByPk(id, { transaction });

        if (!postagem || !postagem.ativo) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        return postagem;
    }

    /* ==========================================================
       FEED (autenticado)
    ========================================================== */
    async findAll(query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const where = { ativo: true };

        if (query.usuarioId) {
            where.usuarioId = query.usuarioId;
        }

        const { rows, count } = await Postagem.findAndCountAll({
            where,
            include: [
                INCLUDE_AUTOR,
                { model: Curtida, as: "curtidas", attributes: ["usuarioId"] }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "DESC"]]
        });

        return montarResposta("postagens", rows, count, pagina, limite);
    }

    /* ==========================================================
       DETALHE COM COMENTÁRIOS
    ========================================================== */
    async findById(id) {
        const postagem = await Postagem.findOne({
            where: { id, ativo: true },
            include: [
                INCLUDE_AUTOR,
                {
                    model: Comentario,
                    as: "comentarios",
                    include: [INCLUDE_AUTOR],
                    separate: true,
                    order: [["created_at", "ASC"]]
                },
                { model: Curtida, as: "curtidas", attributes: ["usuarioId"] }
            ]
        });

        if (!postagem) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        return postagem;
    }

    /* ==========================================================
       CRIAR
    ========================================================== */
    async create(data, solicitante) {
        const postagem = await Postagem.create({
            usuarioId: solicitante.id,
            conteudo: data.conteudo,
            imagem: data.imagem || null
        });

        return this.findById(postagem.id);
    }

    /* ==========================================================
       ATUALIZAR (autor ou admin)
    ========================================================== */
    async update(id, data, solicitante) {
        const transaction = await sequelize.transaction();

        try {
            const postagem = await this.buscarAtiva(id, transaction);

            garantirDono(solicitante, postagem.usuarioId);

            await postagem.update(
                {
                    conteudo: data.conteudo ?? postagem.conteudo,
                    imagem: data.imagem ?? postagem.imagem
                },
                { transaction }
            );

            await transaction.commit();

            return this.findById(id);
        } catch (erro) {
            await transaction.rollback();
            throw erro;
        }
    }

    /* ==========================================================
       REMOVER (soft delete via coluna "ativo")
    ========================================================== */
    async delete(id, solicitante) {
        const postagem = await this.buscarAtiva(id);

        garantirDono(solicitante, postagem.usuarioId);

        postagem.ativo = false;
        await postagem.save();

        return { mensagem: "Postagem removida com sucesso." };
    }

    /* ==========================================================
       CURTIR / DESCURTIR (toggle idempotente)
    ========================================================== */
    async alternarCurtida(id, solicitante) {
        await this.buscarAtiva(id);

        const existente = await Curtida.findOne({
            where: { postagemId: id, usuarioId: solicitante.id }
        });

        if (existente) {
            await existente.destroy();
        } else {
            await Curtida.create({
                postagemId: id,
                usuarioId: solicitante.id
            });
        }

        const total = await Curtida.count({ where: { postagemId: id } });

        return { curtido: !existente, totalCurtidas: total };
    }

    /* ==========================================================
       COMENTÁRIOS
    ========================================================== */
    async comentar(id, comentario, solicitante) {
        await this.buscarAtiva(id);

        const criado = await Comentario.create({
            postagemId: id,
            usuarioId: solicitante.id,
            comentario
        });

        return Comentario.findByPk(criado.id, { include: [INCLUDE_AUTOR] });
    }

    async removerComentario(comentarioId, solicitante) {
        const comentario = await Comentario.findByPk(comentarioId);

        if (!comentario) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        garantirDono(solicitante, comentario.usuarioId);

        await comentario.destroy();

        return { mensagem: "Comentário removido com sucesso." };
    }
}

export default new PostagemService();
