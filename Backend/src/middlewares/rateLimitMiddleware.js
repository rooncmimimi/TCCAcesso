import rateLimit from "express-rate-limit";

/**
 * Rate limiting (OWASP A04 / A07).
 *
 * - `apiLimiter`: proteção geral contra abuso da API.
 * - `authLimiter`: proteção reforçada contra força bruta em login/cadastro.
 */

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem: "Muitas requisições. Tente novamente em alguns minutos."
    }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        sucesso: false,
        mensagem:
            "Muitas tentativas de autenticação. Tente novamente mais tarde."
    }
});
