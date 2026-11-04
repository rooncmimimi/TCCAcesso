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

const AUDIENCE_DESAFIO_DISPOSITIVO = "acesso:dispositivo-desafio";

/**
 * Desafio da verificação por e-mail de um dispositivo novo: vale 20 minutos e só serve para `POST /auth/login/dispositivo`
 * (e o reenvio). Tem `audience` própria, então `verificarJwt` o recusa como access token, e `lerDesafioDispositivo` só aceita a audiência dele.
 */
export const assinarDesafioDispositivo = (payload) => {
    return jwt.sign(payload, env.jwt.secret, { expiresIn: "20m", issuer: "acesso-api", audience: AUDIENCE_DESAFIO_DISPOSITIVO });
};

export const lerDesafioDispositivo = (token) => {
    return jwt.verify(token, env.jwt.secret, { issuer: "acesso-api", audience: AUDIENCE_DESAFIO_DISPOSITIVO });
};
