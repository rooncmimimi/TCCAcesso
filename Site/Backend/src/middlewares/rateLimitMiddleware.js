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
 * Limite dedicado para /auth/senha/esqueci.
 *
 * `authLimiter` usa `skipSuccessfulRequests: true` (correto para
 * login/cadastro, onde uma tentativa legítima responde 2xx e não deve
 * contar contra o próprio usuário). "Esqueci minha senha" é diferente por
 * design: SEMPRE responde 200, mesmo quando o e-mail não existe
 * (anti-enumeração) — com `skipSuccessfulRequests`, isso fazia NENHUMA
 * requisição a esta rota jamais contar para o limite, deixando-a sem
 * proteção efetiva contra abuso (enumeração de e-mails, spam de envio via
 * Brevo). Mesmos limites de `authLimiter`, só sem pular sucesso — a única
 * mudança necessária; `/senha/redefinir` continua em `authLimiter` sem
 * alteração, porque ali uma tentativa errada já responde 4xx e sempre
 * contou normalmente.
 */
export const recuperacaoSenhaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
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
/**
 * Reenvio de e-mail de confirmação de cadastro — 5 por IP a cada hora.
 * Complementa (não substitui) o cooldown de 60s por conta já aplicado em
 * AuthService.reenviarConfirmacaoCadastro: este aqui limita por IP
 * (alguém tentando várias contas), aquele limita por conta (alguém
 * clicando "reenviar" repetidamente na mesma conta).
 */
export const reenvioConfirmacaoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem: "Muitas solicitações de reenvio. Tente novamente mais tarde."
    }
});

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
