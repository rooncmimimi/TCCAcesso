import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * A migration 0007 (conta sem senha). Sem um banco de teste, o que dá para guardar é o texto: que ela
 * faz as duas coisas combinadas, na ordem em que o banco precisa, e que não foi esquecida no README.
 * Quem a aplica no banco de verdade é `npm run migrate`, e isso exige autorização.
 */

// O Vitest roda na pasta do Backend (`npm test`).
const pasta = resolve(process.cwd(), "migrations");
const sql = readFileSync(resolve(pasta, "0007_conta_sem_senha.sql"), "utf8").replace(/\r\n/g, "\n");

/** O SQL de verdade, sem os comentários `--`. */
const comandos = sql
    .split("\n")
    .filter((linha) => !linha.trim().startsWith("--"))
    .join("\n");

describe("0007_conta_sem_senha.sql", () => {
    it("deixa senha_hash aceitar nulo", () => {
        expect(comandos).toMatch(/ALTER TABLE public\.usuarios\s+ALTER COLUMN senha_hash DROP NOT NULL;/);
    });

    it("exige senha OU Google: nenhuma conta fica sem jeito de entrar", () => {
        expect(comandos).toMatch(/ADD CONSTRAINT ck_usuarios_senha_ou_google\s+CHECK \(senha_hash IS NOT NULL OR google_id IS NOT NULL\);/);
    });

    it("solta a restrição antes de recriá-la, para poder rodar de novo", () => {
        expect(comandos).toMatch(/DROP CONSTRAINT IF EXISTS ck_usuarios_senha_ou_google;/);
        expect(comandos.indexOf("DROP CONSTRAINT IF EXISTS")).toBeLessThan(comandos.indexOf("ADD CONSTRAINT"));
    });

    it("tira o NOT NULL antes de criar a restrição que depende de a coluna aceitar nulo", () => {
        expect(comandos.indexOf("DROP NOT NULL")).toBeLessThan(comandos.indexOf("ADD CONSTRAINT"));
    });

    it("não apaga nem altera dados: só estrutura", () => {
        expect(comandos).not.toMatch(/\b(DELETE|UPDATE|TRUNCATE|DROP TABLE|DROP COLUMN)\b/i);
    });

    it("traz no cabeçalho como voltar atrás", () => {
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
        expect(sql).toContain("ALTER COLUMN senha_hash SET NOT NULL");
    });

    it("segue a convenção de nome de restrição do projeto (ck_<tabela>_<colunas>)", () => {
        expect(comandos).toMatch(/ck_usuarios_/);
    });

    it("é a última migration, logo depois da 0006, e está no README", () => {
        const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith(".sql")).sort();

        expect(arquivos.at(-1)).toBe("0007_conta_sem_senha.sql");
        expect(arquivos.at(-2)).toMatch(/^0006_/);
        expect(readFileSync(resolve(pasta, "README.md"), "utf8")).toContain("0007_conta_sem_senha.sql");
    });
});
