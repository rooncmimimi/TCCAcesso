import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Gera um token JWT assinado.
 * O payload deve conter apenas dados NÃO sensíveis.
 */
export const generateToken = (payload) => {
    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn,
        issuer: "acesso-api"
    });
};

/**
 * Verifica e decodifica um token JWT.
 * Lança erro quando o token é inválido ou expirado.
 */
export const verifyToken = (token) => {
    return jwt.verify(token, env.jwt.secret, {
        issuer: "acesso-api"
    });
};
