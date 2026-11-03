import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MOTIVO_MAXIMO, MOTIVO_MINIMO, avaliarAlvo, confirmacaoConfere, motivoValido, origemDoScript } from "./reinicioTotpAdmin.js";

const admin = { tipoUsuario: "administrador", ativo: true, bloqueado: false };

describe("avaliarAlvo: o script só mexe em administrador ativo que tem TOTP", () => {
    it("aceita administrador ativo com TOTP", () => {
        expect(avaliarAlvo(admin, { usuarioId: "u" })).toEqual({ ok: true });
    });

    it("conta que não existe", () => {
        const r = avaliarAlvo(null, null);

        expect(r.ok).toBe(false);
        expect(r.motivo).toContain("Não existe conta");
    });

    it.each(["candidato", "empresa"])("conta de %s não é reiniciada por aqui", (tipoUsuario) => {
        const r = avaliarAlvo({ ...admin, tipoUsuario }, { usuarioId: "u" });

        expect(r.ok).toBe(false);
        expect(r.motivo).toContain("não é de administrador");
    });

    it("administrador desativado ou bloqueado", () => {
        expect(avaliarAlvo({ ...admin, ativo: false }, { usuarioId: "u" }).ok).toBe(false);
        expect(avaliarAlvo({ ...admin, bloqueado: true }, { usuarioId: "u" }).ok).toBe(false);
    });

    it("administrador sem TOTP: não há o que reiniciar", () => {
        const r = avaliarAlvo(admin, null);

        expect(r.ok).toBe(false);
        expect(r.motivo).toContain("não tem TOTP ativo");
    });

    it("toda recusa diz que nada foi alterado", () => {
        for (const r of [avaliarAlvo(null, null), avaliarAlvo({ ...admin, tipoUsuario: "empresa" }, {}), avaliarAlvo({ ...admin, ativo: false }, {}), avaliarAlvo(admin, null)]) {
            expect(r.motivo).toContain("Nada foi alterado");
        }
    });
});

describe("confirmacaoConfere: digitar o e-mail da conta, não um 'sim'", () => {
    it("aceita o mesmo e-mail, sem diferença de caixa ou espaços nas pontas", () => {
        expect(confirmacaoConfere("  Admin@Exemplo.com ", "admin@exemplo.com")).toBe(true);
    });

    it.each([["sim"], ["s"], [""], [null], [undefined], ["outro@exemplo.com"]])("recusa %j", (digitado) => {
        expect(confirmacaoConfere(digitado, "admin@exemplo.com")).toBe(false);
    });
});

describe("motivoValido", () => {
    it(`exige de ${MOTIVO_MINIMO} a ${MOTIVO_MAXIMO} caracteres`, () => {
        expect(motivoValido("Perdeu o celular")).toBe(true);
        expect(motivoValido("curto")).toBe(false);
        expect(motivoValido("   ")).toBe(false);
        expect(motivoValido(null)).toBe(false);
        expect(motivoValido("x".repeat(MOTIVO_MAXIMO + 1))).toBe(false);
        expect(motivoValido("x".repeat(MOTIVO_MAXIMO))).toBe(true);
    });
});

describe("origemDoScript", () => {
    it("registra quem executou e onde, sem inventar um endereço de rede", () => {
        expect(origemDoScript({ usuarioDoSistema: "render", maquina: "srv-1" })).toEqual({
            ip: "script-no-servidor",
            userAgent: "resetarTotpAdmin.js, executado por render@srv-1"
        });
    });
});

describe("o script não vira uma rota", () => {
    const raiz = resolve(__dirname, "../..");

    it("está registrado em package.json como admin:resetar-totp", () => {
        const pacote = JSON.parse(readFileSync(resolve(raiz, "package.json"), "utf8"));

        expect(pacote.scripts["admin:resetar-totp"]).toBe("node scripts/resetarTotpAdmin.js");
    });

    it("nenhum arquivo do servidor importa o script nem expõe o reinício de script por HTTP", () => {
        const rotas = readFileSync(resolve(raiz, "src/controllers/AdminController.js"), "utf8");

        expect(rotas).toContain('origem: "administrador"');
        expect(rotas).not.toContain('origem: "script"');
    });
});
