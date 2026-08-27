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
            Number(process.env.SIGNED_URL_EXPIRES_SECONDS) || 300
    }
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

export default env;
