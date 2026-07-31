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
        maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024
    }
};

export default env;
