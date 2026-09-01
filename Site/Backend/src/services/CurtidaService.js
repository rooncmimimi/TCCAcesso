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
     * `buscarAtiva` aplica a checagem de acesso a conteúdo privado (Fase 3)
     * — sem isso, dava pra listar quem curtiu uma postagem privada sem
     * nunca ter tido acesso a ela.
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
            order: [["created_at", "DESC"]]
        });
    }
}

export default new CurtidaService();
