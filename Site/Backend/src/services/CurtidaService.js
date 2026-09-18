import PostagemService from "./PostagemService.js";
import { Curtida, Usuario } from "../models/index.js";

/**
 * Curtidas do feed (toggle idempotente).
 */
class CurtidaService {
    async alternar(postagemId, solicitante) {
        return PostagemService.alternarCurtida(postagemId, solicitante);
    }

    /**
     * `buscarAtiva` aplica a checagem de acesso a conteúdo privado; sem ela, daria para listar quem
     * curtiu uma postagem privada sem ter acesso a ela.
     */
    async listarPorPostagem(postagemId, solicitante) {
        await PostagemService.buscarAtiva(postagemId, undefined, solicitante);

        return Curtida.findAll({
            where: { postagemId },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil"]
                }
            ],
            order: [["criadoEm", "DESC"]]
        });
    }
}

export default new CurtidaService();
