import dotenv from "dotenv";

dotenv.config();

/**
 * Centraliza e valida todas as variáveis de ambiente.
 *
 * Falhar cedo (fail-fast) evita que o servidor suba com uma
 * configuração incompleta e gere erros obscuros em runtime
 * (ex.: "secretOrPrivateKey must have a value" no JWT).
 */

const obrigatorias = [
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "JWT_SECRET"
];

const ausentes = obrigatorias.filter((chave) => {
    return !process.env[chave] || String(process.env[chave]).trim() === "";
});

if (ausentes.length > 0) {
    console.error(
        `[ENV] Variáveis de ambiente obrigatórias ausentes: ${ausentes.join(", ")}`
    );
    process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
    console.error(
        "[ENV] JWT_SECRET deve possuir no mínimo 32 caracteres. " +
            "Gere um valor forte com: openssl rand -hex 32"
    );
    process.exit(1);
}

const paraLista = (valor, padrao) => {
    if (!valor) {
        return padrao;
    }

    return valor
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

/** É uma URL absoluta (com protocolo) válida? Usado só para o aviso de boot abaixo. */
const ehUrlAbsolutaValida = (valor) => {
    try {
        new URL(valor);
        return true;
    } catch {
        return false;
    }
};

const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i;

/**
 * `FRONTEND_URL` é uma lista, porque o CORS aceita mais de uma origem (localhost em desenvolvimento
 * junto da URL de produção). Os links de e-mail precisam de uma única URL: usar sempre a primeira
 * da lista mandaria links para localhost em produção se ela viesse antes. Por isso vale a primeira
 * origem que não é localhost; o CORS continua usando a lista inteira.
 */
const escolherOrigemPublica = (lista) => lista.find((url) => !ORIGEM_LOCAL.test(url)) ?? lista[0];

const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    isProducao: process.env.NODE_ENV === "production",
    port: Number(process.env.PORT) || 3000,

    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        // Supabase exige SSL. Em ambiente local pode ser desativado.
        ssl: process.env.DB_SSL !== "false"
    },

    jwt: {
        secret: process.env.JWT_SECRET,
        // Access token de vida curta: a renovação transparente via refresh
        // token (SessaoService, validade própria de ~30 dias) é quem
        // sustenta a sessão longa do usuário; o access token só precisa
        // durar o suficiente entre duas renovações automáticas.
        expiresIn: process.env.JWT_EXPIRES_IN || "30m"
    },

    security: {
        bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
        corsOrigins: paraLista(process.env.FRONTEND_URL, [
            "http://localhost:5173"
        ]),
        uploadDir: process.env.UPLOAD_DIR || "uploads",
        maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024,
        // Vídeo precisa de um teto maior que imagem/documento, mas nunca
        // acima do limite real do bucket/projeto Supabase (confirme antes de
        // subir esse valor: Storage > bucket > "Restrict file size").
        maxVideoUploadBytes:
            Number(process.env.MAX_VIDEO_UPLOAD_BYTES) || 50 * 1024 * 1024
    },

    // Armazenamento dos arquivos enviados (fotos, capas, anexos de postagem, currículos). Com as
    // três variáveis abaixo, os arquivos vão para o Supabase Storage, que sobrevive a deploys e
    // reinícios. Sem elas, vão para o disco local: serve para desenvolvimento, mas nunca para
    // produção num host sem disco persistente.
    //
    // Dois buckets, com propósitos que não se misturam:
    // - publicBucket: fotos, capas e logos, resolvidos de forma síncrona via getPublicUrl (podem
    //   ser cacheados), além de anexos antigos de postagem com `privado = false`;
    // - privateBucket: currículos, certificados e anexos de postagem. Nunca viram URL pública: só
    //   URL assinada (createSignedUrl), gerada sob demanda por um endpoint autorizado e nunca
    //   gravada no banco.
    storage: {
        supabaseUrl: process.env.SUPABASE_URL || null,
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
        publicBucket: process.env.SUPABASE_STORAGE_PUBLIC_BUCKET || "public-media",
        privateBucket:
            process.env.SUPABASE_STORAGE_PRIVATE_BUCKET || "private-documents",
        // Validade da URL assinada de documentos privados (segundos).
        signedUrlExpiresSeconds:
            Number(process.env.SIGNED_URL_EXPIRES_SECONDS) || 300,
        // Validade da URL assinada da mídia de postagem cujo autor é público ou empresa no momento
        // da leitura, maior que `signedUrlExpiresSeconds`: não há ganho de segurança em expirar
        // rápido o que qualquer pessoa pode ver, e uma validade maior reduz quantas vezes a mesma
        // mídia é assinada durante a navegação. Mídia de autor privado continua com
        // `signedUrlExpiresSeconds`.
        signedUrlPublicExpiresSeconds:
            Number(process.env.SIGNED_URL_PUBLIC_EXPIRES_SECONDS) || 21600
    },

    // Sugestão de descrição de imagem por IA (OpenRouter): sempre opcional.
    // Sem `apiKey` configurada, o recurso fica indisponível e a aplicação
    // continua funcionando normalmente (descrição manual nunca depende
    // disto). Nunca falha o boot do servidor por causa dessa variável.
    openRouter: {
        apiKey: process.env.OPENROUTER_API_KEY || null,
        // Modelos gratuitos com visão, em ordem de prioridade, no parâmetro `models` da OpenRouter
        // (e não `model`): se um estiver fora do ar, limitado ou recusar por moderação, a
        // OpenRouter tenta o próximo. O roteador genérico "openrouter/free" não é usado porque pode
        // cair num modelo sem relação com descrever imagem (já devolveu a saída de um classificador
        // de moderação). Configurável por `OPENROUTER_MODEL`, uma lista separada por vírgula, caso
        // a oferta de modelos gratuitos mude.
        models: paraLista(process.env.OPENROUTER_MODEL, [
            "minimax/minimax-m3:free",
            "google/gemma-4-31b-it:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
        ]),
        timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS) || 20000
    },

    // E-mail transacional (confirmação de cadastro e recuperação de senha) pela Brevo. Sem
    // `apiKey`, o recurso fica indisponível: em desenvolvimento o código vai para o log do
    // servidor; em produção o servidor sobe, mas registra um aviso, porque ninguém receberia os
    // e-mails.
    brevo: {
        apiKey: process.env.BREVO_API_KEY || null,
        // Precisa ser um remetente verificado no painel do Brevo (endereço
        // ou domínio com SPF/DKIM configurados). Nunca invente um valor
        // aqui sem confirmar isso no painel do Brevo antes de ir a produção.
        remetenteEmail: process.env.BREVO_REMETENTE_EMAIL || null,
        remetenteNome: process.env.BREVO_REMETENTE_NOME || "ACESSO",
        timeoutMs: Number(process.env.BREVO_TIMEOUT_MS) || 15000
    },

    // URL base do Frontend para montar links de e-mail (confirmação de
    // cadastro, redefinição de senha). Reaproveita FRONTEND_URL (mesma
    // variável já usada para CORS): usa a primeira origem da lista que
    // não for localhost (ver `escolherOrigemPublica` acima).
    frontendUrl: escolherOrigemPublica(
        paraLista(process.env.FRONTEND_URL, ["http://localhost:5173"])
    ),

    // Notificações push nativas pelo serviço da Expo, sempre opcionais. Sem `accessToken`, o
    // `NotificacaoPushService` ainda envia (a Expo aceita requisições sem token), mas o "Enhanced
    // Security" fica desligado; em produção, configure `EXPO_ACCESS_TOKEN` (expo.dev → Access
    // Tokens). Erro de envio de push nunca derruba a criação da notificação nem a ação do usuário.
    expoPush: {
        accessToken: process.env.EXPO_ACCESS_TOKEN || null
    }
};

/**
 * Em produção, sem Supabase Storage, os arquivos iriam para o disco local do Render, que é apagado
 * a cada deploy ou reinício. O servidor prefere não subir a perder arquivos de usuários em
 * silêncio.
 */
if (env.isProducao && !(env.storage.supabaseUrl && env.storage.supabaseServiceRoleKey)) {
    console.error(
        "[ENV] Produção sem Supabase Storage configurado (SUPABASE_URL / " +
            "SUPABASE_SERVICE_ROLE_KEY). O disco local do Render é efêmero " +
            "e arquivos enviados seriam perdidos a cada deploy/restart. " +
            "Configure o Supabase Storage antes de subir em produção."
    );
    process.exit(1);
}

/**
 * Aviso (não fail-fast): sem BREVO_API_KEY em produção, nenhum e-mail de
 * confirmação de cadastro ou recuperação de senha é enviado de verdade.
 * A aplicação continua no ar: AutenticacaoService detecta a ausência do provedor
 * e não exige confirmação de e-mail de contas novas nesse caso (evita
 * travar cadastros por uma dependência externa não configurada), mas o
 * comportamento correto (gate de verificação + recuperação de senha por
 * e-mail) só é ativado com a chave configurada.
 */
if (env.isProducao && !env.brevo.apiKey) {
    console.error(
        "[ENV] Produção sem BREVO_API_KEY configurada. Recuperação de senha " +
            "e confirmação de e-mail de cadastro não enviarão e-mails reais " +
            "até essa variável ser configurada no Render."
    );
}

/**
 * Aviso, sem impedir a inicialização: uma `FRONTEND_URL` sem esquema ("meusite.onrender.com" em vez
 * de "https://meusite.onrender.com") não forma uma URL absoluta, e os links de e-mail sairiam
 * errados (`utils/urlFrontend.js` evita que isso derrube a requisição). O aviso mostra o problema
 * já no log de inicialização, sem imprimir o valor da variável.
 */
if (!ehUrlAbsolutaValida(env.frontendUrl)) {
    console.error(
        "[ENV] FRONTEND_URL configurada de forma inválida (precisa ser uma " +
            "URL absoluta com protocolo, ex.: https://seusite.com). Links " +
            "de e-mail (confirmação de cadastro, redefinição de senha) vão " +
            "sair sem o botão de acesso rápido até isso ser corrigido — o " +
            "código numérico continua funcionando normalmente."
    );
}

export default env;
