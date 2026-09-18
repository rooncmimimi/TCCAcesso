import { Usuario } from "../models/index.js";

// Único ponto que define quais campos do autor ficam públicos em postagens, comentários e compartilhamentos.
export const incluirAutor = () => ({
    model: Usuario,
    as: "usuario",
    attributes: ["id", "nome", "fotoPerfil", "tipoUsuario"]
});
