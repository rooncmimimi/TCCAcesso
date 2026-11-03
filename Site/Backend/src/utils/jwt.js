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
    const payload = jwt.verify(token, env.jwt.secret, {
        issuer: "acesso-api"
    });

    // Um token com `aud` foi assinado para outra finalidade (o desafio do segundo fator, por exemplo) e
    // nunca abre uma sessão, mesmo que a assinatura seja a nossa.
    if (payload.aud) {
        throw new Error("token de outra finalidade");
    }

    return payload;
};

const AUDIENCE_DESAFIO_MFA = "acesso:mfa-desafio";

/**
 * Desafio do segundo fator: o que o login entrega no lugar da sessão quando a conta tem verificação em
 * duas etapas. Vale 5 minutos e só serve para `POST /auth/login/totp`: tem `audience` própria, e
 * `verificarJwt` recusa qualquer token com `aud`. Leva o `sub` da conta (nunca o `id` de uma sessão).
 */
export const assinarDesafioMfa = (payload) => {
    return jwt.sign(payload, env.jwt.secret, {
        expiresIn: "5m",
        issuer: "acesso-api",
        audience: AUDIENCE_DESAFIO_MFA
    });
};

export const lerDesafioMfa = (token) => {
    return jwt.verify(token, env.jwt.secret, {
        issuer: "acesso-api",
        audience: AUDIENCE_DESAFIO_MFA
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
