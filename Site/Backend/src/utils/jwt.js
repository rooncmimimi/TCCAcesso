import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Gera um token JWT assinado.
 * O payload deve conter apenas dados não sensíveis.
 */
export const assinarJwt = (payload) => {
    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn,
        issuer: "acesso-api"
    });
};

/**
 * Verifica e decodifica um token JWT.
 * Lança erro quando o token é inválido ou expirado.
 */
export const verificarJwt = (token) => {
    return jwt.verify(token, env.jwt.secret, {
        issuer: "acesso-api"
    });
};

/**
 * O token foi emitido antes da última troca de senha da conta?
 *
 * É o que faz trocar ou redefinir a senha derrubar a sessão em todo aparelho na hora, sem esperar o
 * access token expirar. `iat` vem em segundos, então um token emitido no mesmo segundo da troca
 * continua valendo: é a janela do login que acontece logo depois de trocar a senha.
 */
export const tokenAnteriorATrocaDeSenha = (payload, usuario) => {
    if (!payload?.iat || !usuario?.senhaAlteradaEm) {
        return false;
    }

    return payload.iat < Math.floor(new Date(usuario.senhaAlteradaEm).getTime() / 1000);
};
