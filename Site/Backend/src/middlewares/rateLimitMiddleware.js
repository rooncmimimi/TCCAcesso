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

/**
 * Limite dedicado para /auth/refresh — mais permissivo que o authLimiter
 * (clientes legítimos renovam o token com frequência), mas ainda limita
 * força bruta contra refresh tokens (antes só caía no apiLimiter geral).
 */
export const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        sucesso: false,
        mensagem: "Muitas tentativas de renovação de sessão. Tente novamente mais tarde."
    }
});

/**
 * Limite de denúncias — 10 por usuário autenticado por hora (Fase 10).
 * Chaveado por usuário (não por IP): authMiddleware roda antes deste
 * limiter na rota, então req.user já está populado.
 */
export const denunciaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
        sucesso: false,
        mensagem: "Você atingiu o limite de denúncias por hora. Tente novamente mais tarde."
    }
});

/**
 * Limite de sugestões de descrição de imagem por IA — 30 por usuário
 * autenticado por hora. Cada chamada bate num provedor externo (mesmo
 * sendo o roteador gratuito), então o limite existe para conter custo/
 * abuso, não porque o recurso em si seja perigoso.
 */
export const sugestaoDescricaoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
        sucesso: false,
        mensagem: "Você atingiu o limite de sugestões de descrição por hora. Tente novamente mais tarde ou escreva a descrição manualmente."
    }
});
