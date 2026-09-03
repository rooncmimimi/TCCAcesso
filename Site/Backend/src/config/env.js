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
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    },

    security: {
        bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
        corsOrigins: paraLista(process.env.FRONTEND_URL, [
            "http://localhost:5173"
        ]),
        uploadDir: process.env.UPLOAD_DIR || "uploads",
        maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024,
        // Vídeo precisa de um teto maior que imagem/documento — mas nunca
        // acima do limite real do bucket/projeto Supabase (confirme antes de
        // subir esse valor: Storage > bucket > "Restrict file size").
        maxVideoUploadBytes:
            Number(process.env.MAX_VIDEO_UPLOAD_BYTES) || 50 * 1024 * 1024
    },

    // Armazenamento de arquivos enviados (fotos, capas, anexos de postagem,
    // currículos). Se as três variáveis abaixo estiverem configuradas, os
    // arquivos vão para o Supabase Storage (persistente, sobrevive a
    // deploys/restarts). Sem elas, cai no disco local — suficiente para
    // desenvolvimento, mas NUNCA deve ser usado em produção num host sem
    // disco persistente (o disco é apagado a cada deploy/restart).
    //
    // Dois buckets, dois propósitos (nunca misturar):
    // - publicBucket: fotos, capas, logos, anexos de postagem (imagem/vídeo).
    //   Resolvido de forma síncrona via getPublicUrl — pode ser cacheado.
    // - privateBucket: currículos e certificados. Nunca resolvido para uma
    //   URL pública — só via URL assinada (createSignedUrl), gerada sob
    //   demanda por um endpoint autorizado, nunca persistida no banco.
    storage: {
        supabaseUrl: process.env.SUPABASE_URL || null,
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
        publicBucket: process.env.SUPABASE_STORAGE_PUBLIC_BUCKET || "public-media",
        privateBucket:
            process.env.SUPABASE_STORAGE_PRIVATE_BUCKET || "private-documents",
        // Validade da URL assinada de documentos privados (segundos).
        signedUrlExpiresSeconds:
            Number(process.env.SIGNED_URL_EXPIRES_SECONDS) || 300,
        // Fase 7: validade da URL assinada de mídia de postagem cujo autor
        // está PÚBLICO/é empresa no momento da leitura — mais longa que
        // `signedUrlExpiresSeconds` de propósito. Não há ganho de segurança
        // real em expirar rápido algo que qualquer pessoa já pode ver; uma
        // validade maior só reduz quantas vezes o backend re-assina a mesma
        // mídia durante uma sessão normal de navegação no feed. Mídia de
        // autor PRIVADO continua usando `signedUrlExpiresSeconds` (curta).
        signedUrlPublicExpiresSeconds:
            Number(process.env.SIGNED_URL_PUBLIC_EXPIRES_SECONDS) || 21600
    },

    // Sugestão de descrição de imagem por IA (OpenRouter) — sempre opcional.
    // Sem `apiKey` configurada, o recurso fica indisponível e a aplicação
    // continua funcionando normalmente (descrição manual nunca depende
    // disto). Nunca falha o boot do servidor por causa dessa variável.
    openRouter: {
        apiKey: process.env.OPENROUTER_API_KEY || null,
        // Lista de modelos gratuitos com visão, em ordem de prioridade —
        // usa o parâmetro `models` da OpenRouter (não `model`), que tenta
        // o próximo da lista automaticamente se o anterior estiver fora
        // do ar, limitado, ou recusar por moderação. Deliberadamente NÃO
        // usa mais o roteador "openrouter/free": ele pode cair num modelo
        // sem relação nenhuma com descrever imagem (confirmado: já
        // devolveu a resposta crua de um classificador de moderação de
        // conteúdo, "nvidia/nemotron-3.5-content-safety", em vez de uma
        // descrição). Lista testada manualmente contra a API real da
        // OpenRouter antes de virar padrão — ver relatório no chat.
        // Configurável via OPENROUTER_MODEL (uma lista separada por
        // vírgula) para o caso de a disponibilidade de modelos gratuitos
        // mudar no futuro.
        models: paraLista(process.env.OPENROUTER_MODEL, [
            "minimax/minimax-m3:free",
            "google/gemma-4-31b-it:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
        ]),
        timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS) || 20000
    },

    // E-mail transacional (confirmação de cadastro e recuperação de senha)
    // via Brevo (brevo.com). Sem `apiKey` configurada, o recurso fica
    // indisponível: em desenvolvimento o código continua sendo registrado
    // no log do servidor (como já era); em produção o servidor sobe
    // normalmente, mas emite um aviso alto no log — sem isso, ninguém
    // recebe e-mail de confirmação/recuperação de verdade.
    brevo: {
        apiKey: process.env.BREVO_API_KEY || null,
        // Precisa ser um remetente verificado no painel do Brevo (endereço
        // ou domínio com SPF/DKIM configurados) — nunca invente um valor
        // aqui sem confirmar isso no painel do Brevo antes de ir a produção.
        remetenteEmail: process.env.BREVO_REMETENTE_EMAIL || null,
        remetenteNome: process.env.BREVO_REMETENTE_NOME || "ACESSO",
        timeoutMs: Number(process.env.BREVO_TIMEOUT_MS) || 15000
    },

    // URL base do Frontend para montar links de e-mail (confirmação de
    // cadastro, redefinição de senha). Reaproveita FRONTEND_URL (mesma
    // variável já usada para CORS) — usa a primeira origem da lista.
    frontendUrl: paraLista(process.env.FRONTEND_URL, ["http://localhost:5173"])[0]
};

/**
 * Fail-fast de armazenamento: em produção, subir sem Supabase Storage
 * configurado significa cair silenciosamente no disco local do Render —
 * que é efêmero e é apagado a cada deploy/restart. Isso já causou perda
 * real de arquivos enviados por usuários. Em vez de deixar isso acontecer
 * de novo silenciosamente, o servidor recusa a subir.
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
 * A aplicação continua no ar — AuthService detecta a ausência do provedor
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
 * Aviso (não fail-fast): uma `FRONTEND_URL` sem o esquema (ex.:
 * "meusite.onrender.com" em vez de "https://meusite.onrender.com") não
 * forma uma URL absoluta válida — `new URL(caminho, base)` lançava
 * `TypeError: Invalid URL` direto de dentro do fluxo de e-mail, sem
 * tratamento, virando "Erro interno do servidor." tanto na recuperação de
 * senha quanto na confirmação de cadastro (causa raiz já corrigida em
 * `utils/frontendUrl.js`, que nunca mais deixa isso derrubar a
 * requisição). Este aviso é só para pegar o problema de configuração
 * cedo, direto no log de boot — nunca imprime o valor da variável.
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
