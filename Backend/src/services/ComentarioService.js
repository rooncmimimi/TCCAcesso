import PostagemService from "./PostagemService.js";
import { Comentario, Usuario } from "../models/index.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";

/**
 * Comentários do feed.
 * A validação de existência da postagem e de propriedade fica
 * centralizada no PostagemService para evitar regras duplicadas.
 */
class ComentarioService {
    async listarPorPostagem(postagemId, query) {
        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Comentario.findAndCountAll({
            where: { postagemId },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
                }
            ],
            limit: limite,
            offset,
            order: [["created_at", "ASC"]]
        });

        return montarResposta("comentarios", rows, count, pagina, limite);
    }

    async create(postagemId, comentario, solicitante) {
        return PostagemService.comentar(postagemId, comentario, solicitante);
    }

    async delete(comentarioId, solicitante) {
        return PostagemService.removerComentario(comentarioId, solicitante);
    }
}

export default new ComentarioService();
