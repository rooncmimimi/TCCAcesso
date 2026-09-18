import rateLimit from "express-rate-limit";

/**
 * Rate limiting (OWASP A04 / A07).
 *
 * - `limiteApi`: proteção geral contra abuso da API.
 * - `limiteAutenticacao`: proteção reforçada contra força bruta em login/cadastro.
 */

export const limiteApi = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem: "Muitas requisições. Tente novamente em alguns minutos."
    }
});

export const limiteAutenticacao = rateLimit({
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
 * Limite próprio para /auth/senha/esqueci. O `limiteAutenticacao` usa
 * `skipSuccessfulRequests: true`, certo para login e cadastro, mas "esqueci minha senha" sempre
 * responde 200, mesmo com e-mail inexistente (para não revelar contas); com essa opção, nenhuma
 * requisição contaria. Os limites são os mesmos, só sem pular os sucessos. `/senha/redefinir` fica
 * no `limiteAutenticacao`, porque lá uma tentativa errada responde 4xx.
 */
export const limiteRecuperacaoSenha = rateLimit({
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
 * Limite próprio para /auth/refresh: mais permissivo que o `limiteAutenticacao`, porque clientes
 * legítimos renovam o token com frequência, mas ainda contém força bruta contra refresh tokens.
 */
export const limiteRenovacaoToken = rateLimit({
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
 * Limite de denúncias: 10 por usuário autenticado por hora. A chave é o usuário, e não o IP, porque
 * o `autenticacaoMiddleware` roda antes deste limite na rota e `req.user` já existe.
 */
export const limiteDenuncia = rateLimit({
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
 * Reenvio de e-mail de confirmação de cadastro: 5 por IP a cada hora.
 * Complementa (não substitui) o cooldown de 60s por conta já aplicado em
 * AutenticacaoService.reenviarConfirmacaoCadastro: este aqui limita por IP
 * (alguém tentando várias contas), aquele limita por conta (alguém
 * clicando "reenviar" repetidamente na mesma conta).
 */
export const limiteReenvioConfirmacao = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem: "Muitas solicitações de reenvio. Tente novamente mais tarde."
    }
});

/**
 * Sugestões de descrição de imagem por IA: 30 por usuário autenticado por hora. Cada chamada vai a
 * um provedor externo, então o limite contém custo e abuso.
 */
export const limiteSugestaoDescricao = rateLimit({
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
