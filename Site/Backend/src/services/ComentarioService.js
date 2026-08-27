import PostagemService from "./PostagemService.js";
import { Comentario, Usuario } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono } from "../utils/authorization.js";

// Fábrica: o Sequelize muta objetos de include, então cada uso precisa de um novo objeto.
const incluirAutor = () => ({
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
});

/**
 * Comentários do feed (com respostas em árvore).
 * A validação de existência da postagem e a posse do recurso ficam
 * centralizadas para evitar regras duplicadas.
 */
class ComentarioService {
    async listarPorPostagem(postagemId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Comentario.findAndCountAll({
            where: { postagemId, ativo: true, comentarioPaiId: null },
            include: [
                incluirAutor(),
                {
                    model: Comentario,
                    as: "respostas",
                    required: false,
                    where: { ativo: true },
                    include: [incluirAutor()]
                }
            ],
            limit: limite,
            offset,
            distinct: true,
            order: [["created_at", "ASC"]]
        });

        return montarResposta("comentarios", rows, count, pagina, limite);
    }

    async create(postagemId, comentario, solicitante) {
        return PostagemService.comentar(postagemId, comentario, solicitante);
    }

    async responder(comentarioPaiId, comentario, solicitante) {
        const pai = await Comentario.findByPk(comentarioPaiId);

        if (!pai || !pai.ativo) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        return PostagemService.comentar(
            pai.postagemId,
            comentario,
            solicitante,
            pai.comentarioPaiId || pai.id
        );
    }

    async update(comentarioId, texto, solicitante) {
        const comentario = await Comentario.findByPk(comentarioId);

        if (!comentario || !comentario.ativo) {
            throw ApiError.notFound("Comentário não encontrado.");
        }

        garantirDono(solicitante, comentario.usuarioId);

        await comentario.update({
            comentario: texto,
            editadoEm: new Date()
        });

        return Comentario.findByPk(comentarioId, { include: [incluirAutor()] });
    }

    async delete(comentarioId, solicitante, contexto = {}) {
        return PostagemService.removerComentario(comentarioId, solicitante, contexto);
    }
}

export default new ComentarioService();
