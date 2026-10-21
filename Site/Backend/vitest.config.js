import { defineConfig } from "vitest/config";

/**
 * `src/config/env.js` encerra o processo quando faltam variáveis obrigatórias. Nos testes elas
 * recebem valores fictícios (os mesmos do CI), para `npm test` funcionar sem `.env` e sem banco:
 * nenhum teste abre conexão real. Valores já definidos no ambiente têm precedência.
 */
const ENV_DE_TESTE = {
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "acesso_teste",
    DB_USER: "acesso",
    DB_PASSWORD: "acesso",
    JWT_SECRET: "00000000000000000000000000000000teste",
};

export default defineConfig({
    test: {
        env: Object.fromEntries(
            Object.entries(ENV_DE_TESTE).map(([chave, valor]) => [chave, process.env[chave] ?? valor])
        ),
    },
});
