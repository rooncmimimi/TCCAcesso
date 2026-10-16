import env from "./env.js";
import ErroApi from "../utils/ErroApi.js";

/**
 * Quais origens podem chamar a API pelo navegador.
 *
 * Passam as ferramentas sem `Origin` (curl, Postman, o app Android) e as origens da allowlist. Uma
 * origem recusada recebe **403** (`ErroApi`): com um `Error` comum o `erroMiddleware` respondia 500,
 * que é o código errado para uma recusa de acesso e ainda sujava os alertas de erro do servidor.
 */
export function verificarOrigem(origin, callback) {
    if (!origin || env.security.corsOrigins.includes(origin)) {
        return callback(null, true);
    }

    return callback(ErroApi.acessoNegado("Origem não permitida pelo CORS."));
}

export const opcoesCors = {
    origin: verificarOrigem,
    credentials: true
};
