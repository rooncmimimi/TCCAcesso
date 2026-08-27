import { verifyToken } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";

/**
 * Variante opcional do `authMiddleware`: usada em rotas públicas (perfil de
 * empresa, hoje) que precisam saber QUEM está pedindo — para aplicar
 * privacidade/bloqueio — sem exigir login. Se houver um token válido,
 * popula `req.user` normalmente; caso contrário, segue sem erro e
 * `req.user` fica `undefined` (visitante anônimo).
 */
const authOpcionalMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const [esquema, token] = authHeader.split(" ");

        if (!token || esquema !== "Bearer") {
            return next();
        }

        const payload = verifyToken(token);

        const usuario = await Usuario.findByPk(payload.id, {
            attributes: {
                exclude: ["senhaHash"]
            }
        });

        if (usuario && usuario.ativo && !usuario.bloqueado) {
            req.user = usuario;
        }

        return next();
    } catch {
        // Token ausente/inválido em rota pública não é erro — segue anônimo.
        return next();
    }
};

export default authOpcionalMiddleware;
