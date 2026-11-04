import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { avisoDaMigracaoIdioma } from "./avisosDeAmbiente.js";

/**
 * Idioma na conta (migration 0011). A migration não pode ser aplicada daqui (nunca em produção a partir dos testes), então o texto
 * é conferido; a aplicação de verdade foi exercitada num Postgres descartável. Aqui também: o model só declara a coluna com a
 * chave ligada (senão, subir o código antes da migration derrubaria as preferências de acessibilidade), e o serviço só grava o
 * idioma com a chave ligada.
 */

const sql = readFileSync(resolve(__dirname, "../../migrations/0011_idioma_na_conta.sql"), "utf8").replace(/\r\n/g, "\n");
const comandos = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

describe("migration 0011 (idioma na conta)", () => {
    it("só acrescenta uma coluna nula, repetível", () => {
        expect(comandos).toMatch(/ADD COLUMN IF NOT EXISTS idioma\s+varchar\(5\);/);
        expect(comandos).not.toMatch(/\bNOT NULL\b/);
        expect(comandos).not.toMatch(/\bDEFAULT\b/);
    });

    it("só aceita pt, en, es (ou nulo)", () => {
        expect(comandos).toMatch(/CHECK \(idioma IS NULL OR idioma IN \('pt', 'en', 'es'\)\)/);
    });

    it("não apaga nem atualiza nada existente", () => {
        expect(comandos.replace(/DROP CONSTRAINT IF EXISTS ck_preferencias_acessibilidade_idioma/, "")).not.toMatch(/\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/i);
        expect(comandos).not.toMatch(/ALTER COLUMN/i);
    });

    it("toca só na tabela de preferências e traz como voltar atrás", () => {
        const tabelas = [...comandos.matchAll(/ALTER TABLE (\S+)/g)].map((m) => m[1]);

        expect(new Set(tabelas)).toEqual(new Set(["public.preferencias_acessibilidade"]));
        expect(sql).toMatch(/COMO VOLTAR ATRÁS/);
        expect(sql).toMatch(/DROP COLUMN IF EXISTS idioma/);
        expect(sql).toMatch(/Desligue `IDIOMA_NA_CONTA_HABILITADO`/);
    });
});

describe("avisoDaMigracaoIdioma", () => {
    it("chave desligada: nem consulta o banco", async () => {
        const consultar = vi.fn();

        expect(await avisoDaMigracaoIdioma({ habilitado: false, consultar })).toBeNull();
        expect(consultar).not.toHaveBeenCalled();
    });

    it("coluna aplicada: sem aviso", async () => {
        expect(await avisoDaMigracaoIdioma({ habilitado: true, consultar: async () => ["preferencias_acessibilidade.idioma"] })).toBeNull();
    });

    it("migration ausente: diz o que falta e o que fazer", async () => {
        const aviso = await avisoDaMigracaoIdioma({ habilitado: true, consultar: async () => [] });

        expect(aviso).toContain("0011");
        expect(aviso).toContain("preferencias_acessibilidade.idioma");
        expect(aviso).toContain("npm run migrate");
    });

    it("falha na consulta vira aviso, sem derrubar o servidor", async () => {
        const aviso = await avisoDaMigracaoIdioma({
            habilitado: true,
            consultar: async () => {
                throw new Error("sem conexão");
            }
        });

        expect(aviso).toContain("não consegui conferir");
    });
});

describe("o model PreferenciaAcessibilidade só declara a coluna com a chave ligada", () => {
    beforeEach(() => vi.unstubAllEnvs());
    afterEach(() => vi.unstubAllEnvs());

    async function carregar() {
        vi.resetModules();
        return (await import("../models/PreferenciaAcessibilidade.js")).default;
    }

    it("desligada (padrão): a coluna não entra nas consultas", async () => {
        vi.stubEnv("IDIOMA_NA_CONTA_HABILITADO", "false");
        const Modelo = await carregar();

        expect(Object.keys(Modelo.rawAttributes)).not.toContain("idioma");
    });

    it("ligada: a coluna existe, nula e restrita aos três idiomas", async () => {
        vi.stubEnv("IDIOMA_NA_CONTA_HABILITADO", "true");
        const Modelo = await carregar();

        expect(Modelo.rawAttributes.idioma.allowNull).toBe(true);
        expect(Modelo.rawAttributes.idioma.validate.isIn).toEqual([["pt", "en", "es"]]);
    });

    it("as colunas de sempre continuam presentes nos dois casos", async () => {
        vi.stubEnv("IDIOMA_NA_CONTA_HABILITADO", "false");
        const Modelo = await carregar();

        for (const coluna of ["usuarioId", "tema", "altoContraste", "escalaFonte", "destaqueFoco"]) {
            expect(Object.keys(Modelo.rawAttributes)).toContain(coluna);
        }
    });
});

describe("AcessibilidadeService grava o idioma só com a chave ligada", () => {
    const preferencias = { update: vi.fn() };

    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
        preferencias.update.mockReset();
    });

    async function servico(ligada) {
        vi.stubEnv("IDIOMA_NA_CONTA_HABILITADO", ligada ? "true" : "false");
        vi.doMock("../models/index.js", () => ({ PreferenciaAcessibilidade: { findOrCreate: vi.fn(async () => [preferencias, true]) } }));

        return (await import("../services/AcessibilidadeService.js")).default;
    }

    it("ligada: o idioma entra nas alterações (inclusive nulo)", async () => {
        const s = await servico(true);

        await s.atualizar("u1", { idioma: "en", tema: "escuro" });
        expect(preferencias.update).toHaveBeenLastCalledWith({ idioma: "en", tema: "escuro" });

        await s.atualizar("u1", { idioma: null });
        expect(preferencias.update).toHaveBeenLastCalledWith({ idioma: null });
    });

    it("desligada: o idioma enviado é ignorado, o resto grava", async () => {
        const s = await servico(false);

        await s.atualizar("u1", { idioma: "en", tema: "escuro" });

        expect(preferencias.update).toHaveBeenCalledWith({ tema: "escuro" });
    });
});

describe("o validador do idioma", () => {
    it("aceita pt, en, es e nulo; recusa o resto", async () => {
        const { validarPreferencias } = await import("../validators/acessibilidadeValidator.js");
        const { validationResult } = await import("express-validator");

        const erros = async (corpo) => {
            const req = { body: corpo, headers: {}, query: {}, params: {} };
            await Promise.all(validarPreferencias.map((v) => v.run(req)));

            return validationResult(req).array().map((e) => e.path);
        };

        for (const ok of ["pt", "en", "es", null]) expect(await erros({ idioma: ok })).toEqual([]);
        for (const ruim of ["fr", "PT", "", 1, "pt-BR"]) expect(await erros({ idioma: ruim })).toContain("idioma");
        expect(await erros({})).toEqual([]);
    });
});

describe("a ligação com o servidor e os exemplos", () => {
    it("server.js confere a coluna por information_schema.columns com alias, e a chave nasce desligada", () => {
        const servidor = readFileSync(resolve(__dirname, "../server.js"), "utf8");
        const exemplo = readFileSync(resolve(__dirname, "../../.env.example"), "utf8");
        const render = readFileSync(resolve(__dirname, "../../../../render.yaml"), "utf8").replace(/\r\n/g, "\n");

        expect(servidor).toContain("avisoDaMigracaoIdioma");
        expect(servidor).toContain("AS item FROM information_schema.columns");
        expect(exemplo).toMatch(/^IDIOMA_NA_CONTA_HABILITADO=false/m);
        expect(render).toMatch(/key: IDIOMA_NA_CONTA_HABILITADO\n\s+value: "false"/);
    });
});
