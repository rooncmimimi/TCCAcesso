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
 * Limite das rotas do fluxo do Google que acontecem **antes** de existir sessão: `iniciar` (a URL da
 * tela de consentimento) e `callback` (a volta do Google, que chama o Google para trocar o código).
 *
 * O `limiteAutenticacao` não serve aqui: ele só conta falhas, e essas rotas quase sempre respondem
 * 200 (ou 302), então nunca chegariam ao limite; sobraria o limite geral de 300 por 15 minutos. Este
 * conta todas as requisições. Entrar uma vez custa uma chamada a cada rota, então 60 por IP a cada 15
 * minutos deixa folga até para uma escola ou um escritório inteiro atrás do mesmo IP.
 *
 * `aoExceder` troca a resposta padrão (JSON 429) por outra: o `callback` é uma navegação do
 * navegador, e um JSON solto na tela não diz nada à pessoa.
 */
export const LIMITE_GOOGLE_POR_JANELA = 60;

export function criarLimiteGoogle({ max = LIMITE_GOOGLE_POR_JANELA, aoExceder } = {}) {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            sucesso: false,
            mensagem: "Muitas tentativas de entrar com o Google. Tente novamente em alguns minutos."
        },
        ...(aoExceder ? { handler: (req, res) => aoExceder(req, res) } : {})
    });
}

/**
 * Fale conosco: 5 mensagens por IP a cada hora, contando todas (não só as recusadas). Uma pessoa de boa-fé
 * escreve uma, no máximo duas; o limite existe para o formulário não virar um disparador de e-mail.
 */
export const limiteContato = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        mensagem: "Você já enviou várias mensagens. Aguarde um pouco antes de enviar outra."
    }
});

/** `GET /auth/google/iniciar`: responde 429 em JSON, que o Site mostra como aviso. */
export const limiteGoogleIniciar = criarLimiteGoogle();

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
/**
 * Completar o currículo com IA: 10 por hora, por conta.
 *
 * Mais baixo que o da descrição de imagem porque cada pedido manda um currículo inteiro ao modelo,
 * e porque ninguém precisa disso dez vezes: a pessoa importa, confere e segue. Quem bate no limite
 * não fica sem nada — a leitura por regras continua funcionando, e os campos são editáveis.
 */
export const limiteCompletarCurriculo = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
        sucesso: false,
        mensagem:
            "Você atingiu o limite de preenchimentos por IA desta hora. Os campos lidos do currículo continuam aí, e você pode completar o que falta à mão."
    }
});

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

/**
 * Tradução de conteúdo: 30 pedidos por IP a cada hora.
 *
 * A rota é pública (o feed e a vaga são abertos), e cada falta de cache gasta cota de um serviço
 * externo. Lendo normalmente ninguém chega perto de 30: cada clique em "Traduzir" é um pedido, e o
 * mesmo texto só custa na primeira vez. Quem bate neste limite não fica sem tradução — o Site cai
 * para a reserva gratuita.
 */
export const limiteTraducao = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
        sucesso: false,
        mensagem: "Você traduziu muitos textos nesta hora. Tente novamente mais tarde."
    }
});
