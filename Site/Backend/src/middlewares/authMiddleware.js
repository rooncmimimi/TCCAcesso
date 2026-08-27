import { verifyToken } from "../utils/jwt.js";
import { Usuario } from "../models/index.js";
import ApiError from "../utils/ApiError.js";

/**
 * Autenticação via Bearer Token (JWT).
 *
 * Além de validar a assinatura, recarrega o usuário do banco para
 * garantir que ele ainda existe e continua ativo — um token válido
 * de um usuário desativado NÃO deve conceder acesso (OWASP A01/A07).
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const [esquema, token] = authHeader.split(" ");

        if (!token || esquema !== "Bearer") {
            throw ApiError.unauthorized("Token não informado.");
        }

        let payload;

        try {
            payload = verifyToken(token);
        } catch {
            throw ApiError.unauthorized("Token inválido ou expirado.");
        }

        const usuario = await Usuario.findByPk(payload.id, {
            attributes: {
                exclude: ["senhaHash"]
            }
        });

        if (!usuario) {
            throw ApiError.unauthorized("Usuário não encontrado.");
        }

        if (!usuario.ativo) {
            throw ApiError.forbidden("Usuário desativado.");
        }

        if (usuario.bloqueado) {
            throw ApiError.forbidden("Usuário bloqueado.");
        }

        req.user = usuario;

        return next();
    } catch (erro) {
        return next(erro);
    }
};

export default authMiddleware;
