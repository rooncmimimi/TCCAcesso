import { describe, it, expect, vi } from "vitest";

import { avisoDaMigracaoTotp, avisosDoMfa } from "./avisosDeAmbiente.js";

const TUDO = ["autenticacao_totp", "codigos_recuperacao_totp", "sessoes.mfa_verificado_em"];

describe("avisosDoMfa", () => {
    it("recurso desligado: nenhum aviso, nem em produção", () => {
        expect(avisosDoMfa({ mfa: { habilitado: false, chaveCifra: null }, isProducao: true })).toEqual([]);
    });

    it("produção ligada sem chave própria: avisa que trocar o JWT_SECRET deixaria os TOTP ilegíveis", () => {
        const [aviso, ...resto] = avisosDoMfa({ mfa: { habilitado: true, chaveCifra: null }, isProducao: true });

        expect(resto).toEqual([]);
        expect(aviso).toContain("MFA_CHAVE_CIFRA");
        expect(aviso).toContain("JWT_SECRET");
    });

    it("desenvolvimento sem chave própria: tudo bem", () => {
        expect(avisosDoMfa({ mfa: { habilitado: true, chaveCifra: null }, isProducao: false })).toEqual([]);
    });

    it("chave própria curta demais", () => {
        const avisos = avisosDoMfa({ mfa: { habilitado: true, chaveCifra: "curta" }, isProducao: true });

        expect(avisos).toHaveLength(1);
        expect(avisos[0]).toContain("menos de 32");
    });

    it("chave própria longa em produção: sem aviso", () => {
        expect(avisosDoMfa({ mfa: { habilitado: true, chaveCifra: "c".repeat(40) }, isProducao: true })).toEqual([]);
    });

    it("nenhum aviso imprime o valor da chave", () => {
        const texto = JSON.stringify(avisosDoMfa({ mfa: { habilitado: true, chaveCifra: "segredo-curto" }, isProducao: true }));

        expect(texto).not.toContain("segredo-curto");
    });
});

describe("avisoDaMigracaoTotp", () => {
    it("recurso desligado: não consulta o banco", async () => {
        const consultar = vi.fn();

        expect(await avisoDaMigracaoTotp({ habilitado: false, consultar })).toBeNull();
        expect(consultar).not.toHaveBeenCalled();
    });

    it("tudo aplicado: sem aviso", async () => {
        expect(await avisoDaMigracaoTotp({ habilitado: true, consultar: async () => TUDO })).toBeNull();
    });

    it("migration não aplicada: avisa o que falta e o que fazer", async () => {
        const aviso = await avisoDaMigracaoTotp({ habilitado: true, consultar: async () => [] });

        expect(aviso).toContain("0008");
        for (const item of TUDO) expect(aviso).toContain(item);
        expect(aviso).toContain("npm run migrate");
    });

    it("só uma parte aplicada: lista só o que falta", async () => {
        const aviso = await avisoDaMigracaoTotp({ habilitado: true, consultar: async () => ["autenticacao_totp", "codigos_recuperacao_totp"] });

        expect(aviso).toContain("sessoes.mfa_verificado_em");
        expect(aviso).not.toContain("faltam: autenticacao_totp");
    });

    it("falha da própria consulta vira aviso, sem derrubar o servidor", async () => {
        const aviso = await avisoDaMigracaoTotp({
            habilitado: true,
            consultar: async () => {
                throw new Error("sem conexão");
            }
        });

        expect(aviso).toContain("não consegui conferir");
    });
});

describe("a consulta da inicialização (server.js)", () => {
    it("não começa com 'SELECT table_name FROM information_schema.tables'", async () => {
        const { readFileSync } = await import("node:fs");
        const { resolve } = await import("node:path");
        const servidor = readFileSync(resolve(__dirname, "../server.js"), "utf8");

        // O Sequelize trata essa forma exata como a listagem de tabelas dele e devolve arrays em vez de objetos:
        // a conferência acusaria "migration não aplicada" mesmo com tudo aplicado. Visto na rodada funcional.
        expect(servidor).not.toMatch(/"SELECT table_name FROM information_schema\.tables/);
        expect(servidor).toContain("AS nome FROM pg_tables");
    });
});
