import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { avisoDaMigracaoSessoes } from "./avisosDeAmbiente.js";

/**
 * A migration 0009 não pode ser aplicada daqui (nunca em produção a partir dos testes), então o texto é conferido. A
 * aplicação de verdade (e o rollback) foram exercitados num Postgres descartável.
 */

const sql = readFileSync(resolve(__dirname, "../../migrations/0009_sessoes_e_dispositivos.sql"), "utf8").replace(/\r\n/g, "\n");

describe("migration 0009 (sessões e dispositivos)", () => {
    it("só acrescenta colunas e índices à tabela sessoes", () => {
        expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS familia_id\s+uuid/);
        expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS iniciada_em\s+timestamptz/);
        expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS ultimo_uso_em\s+timestamptz/);
        expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_sessoes_familia_ativa/);
        expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em/);
    });

    it("não apaga nada nem mexe nas colunas existentes", () => {
        const comandos = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

        expect(comandos).not.toMatch(/\b(DROP|DELETE|TRUNCATE)\b/i);
        expect(comandos).not.toMatch(/ALTER COLUMN/i);
    });

    it("o único UPDATE preenche só as colunas novas, e só onde ainda estão vazias", () => {
        const atualizacoes = sql.match(/UPDATE public\.sessoes[\s\S]*?;/g) ?? [];

        expect(atualizacoes).toHaveLength(1);
        expect(atualizacoes[0]).toMatch(/WHERE familia_id IS NULL/);
        expect(atualizacoes[0]).toMatch(/familia_id\s*=\s*id/);
        expect(atualizacoes[0]).not.toMatch(/token_hash|revogada_em|expira_em\s*=/);
    });

    it("é repetível e traz no cabeçalho como voltar atrás", () => {
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
        expect(sql).toMatch(/DROP COLUMN IF EXISTS familia_id/);
        expect(sql).toMatch(/Desligue `SESSOES_DISPOSITIVOS_HABILITADO`/);
    });
});

describe("avisoDaMigracaoSessoes", () => {
    const TUDO = ["sessoes.familia_id", "sessoes.iniciada_em", "sessoes.ultimo_uso_em"];

    it("chave desligada: nem consulta o banco", async () => {
        let consultou = false;

        expect(await avisoDaMigracaoSessoes({ habilitado: false, consultar: async () => ((consultou = true), []) })).toBeNull();
        expect(consultou).toBe(false);
    });

    it("tudo aplicado: sem aviso", async () => {
        expect(await avisoDaMigracaoSessoes({ habilitado: true, consultar: async () => TUDO })).toBeNull();
    });

    it("migration ausente: lista o que falta e diz o que fazer", async () => {
        const aviso = await avisoDaMigracaoSessoes({ habilitado: true, consultar: async () => [] });

        expect(aviso).toContain("0009");
        for (const item of TUDO) expect(aviso).toContain(item);
        expect(aviso).toContain("npm run migrate");
    });

    it("falha na consulta vira aviso, sem derrubar o servidor", async () => {
        const aviso = await avisoDaMigracaoSessoes({
            habilitado: true,
            consultar: async () => {
                throw new Error("sem conexão");
            }
        });

        expect(aviso).toContain("não consegui conferir");
    });
});

describe("a consulta da inicialização (server.js)", () => {
    it("usa colunas (information_schema.columns) com alias, e liga a limpeza periódica sem derrubar o servidor", () => {
        const servidor = readFileSync(resolve(__dirname, "../server.js"), "utf8");

        expect(servidor).toContain("avisoDaMigracaoSessoes");
        expect(servidor).toContain("AS item FROM information_schema.columns");
        expect(servidor).toContain("limparAntigas");
        expect(servidor).toContain(".unref()");
    });
});
