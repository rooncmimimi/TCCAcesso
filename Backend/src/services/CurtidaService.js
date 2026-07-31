import PostagemService from "./PostagemService.js";
import { Curtida, Usuario } from "../models/index.js";

/**
 * Curtidas do feed (toggle idempotente).
 */
class CurtidaService {
    async alternar(postagemId, solicitante) {
        return PostagemService.alternarCurtida(postagemId, solicitante);
    }

    async listarPorPostagem(postagemId) {
        return Curtida.findAll({
            where: { postagemId },
            include: [
                {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["id", "nome", "fotoPerfil"]
                }
            ],
            order: [["created_at", "DESC"]]
        });
    }
}

export default new CurtidaService();
