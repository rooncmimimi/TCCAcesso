import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { RECURSOS, avaliarImplantacao, formatarRelatorio } from "./implantacao.js";

const pasta = resolve(__dirname, "../../migrations");
const ARQUIVOS = readdirSync(pasta).filter((a) => a.endsWith(".sql"));
const ATE_0006 = ARQUIVOS.filter((a) => a <= "0006_zzz");

describe("a relação recurso → migration", () => {
    it("toda migration citada existe em migrations/", () => {
        for (const recurso of RECURSOS) expect(ARQUIVOS).toContain(recurso.migration);
    });

    it("toda chave citada é lida de verdade pelo servidor (env.js)", () => {
        const env = readFileSync(resolve(__dirname, "../config/env.js"), "utf8");

        for (const recurso of RECURSOS) expect(env).toContain(recurso.chave);
    });
});

describe("avaliarImplantacao", () => {
    it("o estado real da produção hoje (até a 0006, tudo desligado): 3 pendentes e nenhum bloqueio", () => {
        const r = avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ATE_0006, ambiente: {} });

        expect(r.pendentes).toEqual(ARQUIVOS.filter((a) => a > "0006_zzz").sort());
        expect(r.pronto).toBe(true);
        expect(r.bloqueios).toBe(0);
    });

    it.each(RECURSOS.map((r) => [r.chave, r.migration]))("%s ligada sem a migration %s: BLOQUEIA", (chave, migration) => {
        const r = avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ARQUIVOS.filter((a) => a !== migration), ambiente: { [chave]: "true" } });

        expect(r.pronto).toBe(false);
        expect(r.itens.find((i) => i.nivel === "erro").texto).toContain(chave);
        expect(r.itens.find((i) => i.nivel === "erro").texto).toContain(migration);
    });

    it("ligada COM a migration aplicada: sem bloqueio", () => {
        const r = avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ARQUIVOS, ambiente: { SESSOES_DISPOSITIVOS_HABILITADO: "true" } });

        expect(r.pronto).toBe(true);
    });

    it("TOTP ligado em produção sem MFA_CHAVE_CIFRA: aviso (não bloqueio)", () => {
        const r = avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ARQUIVOS, ambiente: { MFA_TOTP_HABILITADO: "true" }, producao: true });

        expect(r.pronto).toBe(true);
        expect(r.avisos).toBe(1);
        expect(r.itens.find((i) => i.nivel === "aviso").texto).toContain("MFA_CHAVE_CIFRA");
    });

    it("com a chave de 32+ caracteres, sem aviso; fora de produção, também", () => {
        expect(avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ARQUIVOS, ambiente: { MFA_TOTP_HABILITADO: "true", MFA_CHAVE_CIFRA: "x".repeat(40) }, producao: true }).avisos).toBe(0);
        expect(avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ARQUIVOS, ambiente: { MFA_TOTP_HABILITADO: "true" }, producao: false }).avisos).toBe(0);
    });

    it("aceita 'True', ' true ' e rejeita 'sim' como ligado (o servidor só liga com 'true')", () => {
        const ligado = (v) => avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: [], ambiente: { MFA_TOTP_HABILITADO: v } }).pronto === false;

        expect(ligado("True")).toBe(true);
        expect(ligado(" true ")).toBe(true);
        expect(ligado("sim")).toBe(false);
        expect(ligado("1")).toBe(false);
    });
});

describe("formatarRelatorio", () => {
    it("nunca imprime o valor de uma variável, só o nome", () => {
        const texto = formatarRelatorio(avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: [], ambiente: { MFA_TOTP_HABILITADO: "true", MFA_CHAVE_CIFRA: "segredo-super-secreto-1234567890-abcdef" } }));

        expect(texto).not.toContain("segredo-super-secreto");
        expect(texto).toContain("MFA_TOTP_HABILITADO");
    });

    it("diz o resultado final", () => {
        expect(formatarRelatorio(avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: ARQUIVOS, ambiente: {} }))).toContain("sem bloqueios");
        expect(formatarRelatorio(avaliarImplantacao({ arquivos: ARQUIVOS, aplicadas: [], ambiente: { SESSOES_DISPOSITIVOS_HABILITADO: "true" } }))).toContain("bloqueio(s)");
    });
});

describe("os scripts", () => {
    it("estão no package.json e o verificador não escreve no banco", () => {
        const pacote = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8"));
        const script = readFileSync(resolve(__dirname, "../../scripts/verificarImplantacao.js"), "utf8");

        expect(pacote.scripts["implantacao:verificar"]).toBe("node scripts/verificarImplantacao.js");
        expect(pacote.scripts["mfa:gerar-chave"]).toBe("node scripts/gerarChaveMfa.js");
        expect(script).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)\b/);
    });
});
