/**
 * Conferência de implantação, SOMENTE LEITURA: o que falta aplicar neste banco e o que não pode ser ligado ainda.
 *
 *     npm run implantacao:verificar
 *
 * Usa o banco e as variáveis do ambiente em que roda (o `.env` local, ou o Shell do Render). Não altera nada: só lê
 * `migracoes_aplicadas`. Sai com código 1 se alguma chave de recurso estiver ligada sem a migration dela (o que derrubaria
 * login e rotas), e com 0 caso contrário.
 *
 * Nunca imprime senha, chave ou qualquer valor de variável: só os nomes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import { avaliarImplantacao, formatarRelatorio } from "../src/utils/implantacao.js";

dotenv.config();

const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const faltando = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"].filter((chave) => !process.env[chave]);

if (faltando.length > 0) {
    console.error(`[IMPLANTACAO] Variáveis de ambiente ausentes: ${faltando.join(", ")}`);
    process.exit(1);
}

const cliente = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    application_name: "acesso-verificar-implantacao"
});

try {
    await cliente.connect();

    // Só leitura. Se a tabela de controle ainda não existe, nada foi aplicado por este mecanismo.
    const { rows: existe } = await cliente.query("SELECT to_regclass('public.migracoes_aplicadas') AS tabela");
    const aplicadas = existe[0].tabela ? (await cliente.query("SELECT nome FROM public.migracoes_aplicadas")).rows.map((linha) => linha.nome) : [];

    const avaliacao = avaliarImplantacao({
        arquivos: fs.readdirSync(PASTA).filter((arquivo) => arquivo.endsWith(".sql")),
        aplicadas,
        ambiente: process.env,
        producao: process.env.NODE_ENV === "production"
    });

    console.log(`\nConferência de implantação (somente leitura; ${aplicadas.length} migration(ões) registrada(s) neste banco)\n`);
    console.log(formatarRelatorio(avaliacao));

    process.exitCode = avaliacao.pronto ? 0 : 1;
} catch (erro) {
    console.error(`[IMPLANTACAO] Não foi possível conferir: ${erro.message}`);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
