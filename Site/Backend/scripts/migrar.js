/**
 * Aplica as migrations pendentes do banco.
 *
 * Roda no build do Render (`npm install && npm run migrate`), antes de o servidor novo entrar no
 * ar: se a migration falhar, o build falha e a versão anterior continua servindo, em vez de o
 * servidor subir contra um banco fora de forma.
 *
 * Como decide o que aplicar:
 * - a tabela `migracoes_aplicadas` guarda o nome de cada arquivo já rodado;
 * - cada arquivo pendente roda dentro de uma transação e só é registrado se der certo;
 * - um banco que já tem o schema mas ainda não tem a tabela de controle (o caso do banco que
 *   existia antes deste script) adota o baseline como aplicado, em vez de tentar criar tudo de
 *   novo por cima.
 *
 * Rodar de novo sem nada pendente não faz nada e sai com 0.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.join(AQUI, "..", "migrations");
const BASELINE = "0001_esquema_inicial.sql";

const obrigatorias = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const faltando = obrigatorias.filter((chave) => !process.env[chave]);

if (faltando.length > 0) {
    console.error(`[MIGRAR] Variáveis de ambiente ausentes: ${faltando.join(", ")}`);
    process.exit(1);
}

const cliente = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
    application_name: "acesso-migrar"
});

/** Arquivos `NNNN_*.sql` em ordem numérica — a ordem do nome é a ordem de aplicação. */
function listarMigrations() {
    return fs
        .readdirSync(PASTA)
        .filter((arquivo) => arquivo.endsWith(".sql"))
        .sort((a, b) => a.localeCompare(b, "en"));
}

async function main() {
    await cliente.connect();

    const { rowCount: tabelaDeControleJaExistia } = await cliente.query(
        "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'migracoes_aplicadas'"
    );

    // Mesmas convenções das tabelas da aplicação: `criado_em` (o momento em que a migration foi
    // aplicada), RLS ligada e sem acesso para `anon`/`authenticated`.
    await cliente.query(`
        CREATE TABLE IF NOT EXISTS public.migracoes_aplicadas (
            nome       text NOT NULL,
            criado_em  timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT pk_migracoes_aplicadas PRIMARY KEY (nome)
        )
    `);
    await cliente.query("ALTER TABLE public.migracoes_aplicadas ENABLE ROW LEVEL SECURITY");
    await cliente.query("REVOKE ALL ON TABLE public.migracoes_aplicadas FROM anon, authenticated");
    await cliente.query(
        "COMMENT ON TABLE public.migracoes_aplicadas IS 'Migrations já aplicadas neste banco, uma linha por arquivo de migrations/.'"
    );

    if (!tabelaDeControleJaExistia) {
        const { rows } = await cliente.query("SELECT to_regclass('public.usuarios') AS existe");

        if (rows[0].existe) {
            await cliente.query(
                "INSERT INTO public.migracoes_aplicadas (nome) VALUES ($1) ON CONFLICT DO NOTHING",
                [BASELINE]
            );
            console.log(`[MIGRAR] Banco já tinha o schema: ${BASELINE} registrado como aplicado.`);
        }
    }

    const { rows: aplicadas } = await cliente.query("SELECT nome FROM public.migracoes_aplicadas");
    const jaAplicadas = new Set(aplicadas.map((linha) => linha.nome));
    const pendentes = listarMigrations().filter((arquivo) => !jaAplicadas.has(arquivo));

    if (pendentes.length === 0) {
        console.log(`[MIGRAR] Nada pendente (${jaAplicadas.size} migration(s) já aplicada(s)).`);
        return;
    }

    for (const arquivo of pendentes) {
        const sql = fs.readFileSync(path.join(PASTA, arquivo), "utf8");
        const inicio = Date.now();

        try {
            await cliente.query("BEGIN");
            await cliente.query(sql);
            await cliente.query("INSERT INTO public.migracoes_aplicadas (nome) VALUES ($1)", [arquivo]);
            await cliente.query("COMMIT");
            console.log(`[MIGRAR] ${arquivo} aplicada em ${((Date.now() - inicio) / 1000).toFixed(1)}s.`);
        } catch (erro) {
            await cliente.query("ROLLBACK").catch(() => {});
            // A migration inteira volta atrás; o banco fica no estado anterior a este arquivo.
            console.error(`[MIGRAR] Falha em ${arquivo}: ${erro.message}`);
            throw erro;
        }
    }

    console.log(`[MIGRAR] ${pendentes.length} migration(s) aplicada(s).`);
}

try {
    await main();
} catch {
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
