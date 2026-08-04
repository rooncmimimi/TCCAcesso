import {
    Compartilhamento,
    Postagem,
    Usuario
} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import { resolverPaginacao, montarResposta } from "../utils/pagination.js";
import { garantirDono } from "../utils/authorization.js";
import NotificacaoService from "./NotificacaoService.js";

const INCLUDE_AUTOR = {
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
};

/**
 * Compartilhamento de postagens do feed.
 */
class CompartilhamentoService {
    async buscarPostagemAtiva(postagemId) {
        const postagem = await Postagem.findByPk(postagemId);

        if (!postagem || !postagem.ativo) {
            throw ApiError.notFound("Postagem não encontrada.");
        }

        return postagem;
    }

    async listarPorPostagem(postagemId, query) {
        await this.buscarPostagemAtiva(postagemId);

        const { pagina, limite, offset } = resolverPaginacao(query);

        const { rows, count } = await Compartilhamento.findAndCountAll({
            where: { postagemId },
            include: [INCLUDE_AUTOR],
            limit: limite,
            offset,
            order: [["created_at", "DESC"]]
        });

        return montarResposta(
            "compartilhamentos",
            rows,
            count,
            pagina,
            limite
        );
    }

    async compartilhar(postagemId, comentario, solicitante) {
        const postagem = await this.buscarPostagemAtiva(postagemId);

        const compartilhamento = await Compartilhamento.create({
            postagemId,
            usuarioId: solicitante.id,
            comentario: comentario ? String(comentario).trim() : null
        });

        if (String(postagem.usuarioId) !== String(solicitante.id)) {
            await NotificacaoService.criar({
                usuarioId: postagem.usuarioId,
                tipo: "Feed",
                titulo: "Sua publicação foi compartilhada",
                descricao: `${solicitante.nome} compartilhou sua publicação.`
            });
        }

        return Compartilhamento.findByPk(compartilhamento.id, {
            include: [INCLUDE_AUTOR]
        });
    }

    async remover(id, solicitante) {
        const registro = await Compartilhamento.findByPk(id);

        if (!registro) {
            throw ApiError.notFound("Compartilhamento não encontrado.");
        }

        garantirDono(solicitante, registro.usuarioId);

        await registro.destroy();

        return { mensagem: "Compartilhamento removido." };
    }
}

export default new CompartilhamentoService();
