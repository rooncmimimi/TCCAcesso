import { describe, it, expect, vi, beforeEach } from "vitest";

const { env } = vi.hoisted(() => ({
    env: { jwt: { secret: "k".repeat(64) }, mfa: { chaveCifra: null } }
}));

vi.mock("../config/env.js", () => ({ default: env }));

const {
    abrirConfiguracao,
    cifrarSegredoTotp,
    decifrarSegredoTotp,
    gerarCodigosDeRecuperacao,
    hashCodigoDeRecuperacao,
    normalizarCodigoDeRecuperacao,
    pareceCodigoDeRecuperacao,
    selarConfiguracao
} = await import("./segredosMfa.js");

beforeEach(() => {
    env.mfa.chaveCifra = null;
});

describe("segredo do TOTP no banco", () => {
    it("é cifrado (não aparece em claro) e volta igual", () => {
        const cifrado = cifrarSegredoTotp("JBSWY3DPEHPK3PXP", "usuario-1");

        expect(cifrado).not.toContain("JBSWY3DPEHPK3PXP");
        expect(decifrarSegredoTotp(cifrado, "usuario-1")).toBe("JBSWY3DPEHPK3PXP");
    });

    it("não abre em outra conta: copiar a linha de um usuário para outro não serve", () => {
        const cifrado = cifrarSegredoTotp("JBSWY3DPEHPK3PXP", "usuario-1");

        expect(() => decifrarSegredoTotp(cifrado, "usuario-2")).toThrow();
    });

    it("uma alteração no valor é recusada", () => {
        const cifrado = cifrarSegredoTotp("JBSWY3DPEHPK3PXP", "usuario-1");
        const adulterado = `${cifrado.slice(0, -2)}${cifrado.endsWith("AA") ? "BB" : "AA"}`;

        expect(() => decifrarSegredoTotp(adulterado, "usuario-1")).toThrow();
    });

    it("a chave própria (MFA_CHAVE_CIFRA) é outra chave: valor cifrado com uma não abre com a outra", () => {
        const comJwt = cifrarSegredoTotp("JBSWY3DPEHPK3PXP", "usuario-1");

        env.mfa.chaveCifra = "c".repeat(48);

        expect(() => decifrarSegredoTotp(comJwt, "usuario-1")).toThrow();
        expect(decifrarSegredoTotp(cifrarSegredoTotp("JBSWY3DPEHPK3PXP", "usuario-1"), "usuario-1")).toBe("JBSWY3DPEHPK3PXP");
    });

    it("o contexto é de verdade o segredo: o mesmo texto cifrado como configuração não abre como segredo", () => {
        const selo = selarConfiguracao("JBSWY3DPEHPK3PXP", "usuario-1");

        expect(() => decifrarSegredoTotp(selo, "usuario-1")).toThrow();
    });
});

describe("configuração em andamento (segredo ainda não confirmado)", () => {
    const agora = 1_700_000_000_000;

    it("abre dentro do prazo, para a mesma conta", () => {
        const selo = selarConfiguracao("JBSWY3DPEHPK3PXP", "usuario-1", { agora });

        expect(abrirConfiguracao(selo, "usuario-1", { agora: agora + 60_000 })).toEqual({ segredo: "JBSWY3DPEHPK3PXP", troca: false });
    });

    it("guarda se é uma troca de aparelho", () => {
        const selo = selarConfiguracao("JBSWY3DPEHPK3PXP", "usuario-1", { agora, troca: true });

        expect(abrirConfiguracao(selo, "usuario-1", { agora })?.troca).toBe(true);
    });

    it("vence em dez minutos", () => {
        const selo = selarConfiguracao("JBSWY3DPEHPK3PXP", "usuario-1", { agora });

        expect(abrirConfiguracao(selo, "usuario-1", { agora: agora + 10 * 60_000 + 1 })).toBeNull();
    });

    it("não abre para outra conta", () => {
        const selo = selarConfiguracao("JBSWY3DPEHPK3PXP", "usuario-1", { agora });

        expect(abrirConfiguracao(selo, "usuario-2", { agora })).toBeNull();
    });

    it.each([[""], [null], ["lixo"], ["AAAA"]])("valor inventado (%j) vira null, sem lançar", (selo) => {
        expect(abrirConfiguracao(selo, "usuario-1", { agora })).toBeNull();
    });
});

describe("códigos de recuperação", () => {
    it("são dez, diferentes entre si, no formato ABCDE-FGHJK sem caracteres confundíveis", () => {
        const codigos = gerarCodigosDeRecuperacao();

        expect(codigos).toHaveLength(10);
        expect(new Set(codigos).size).toBe(10);

        for (const codigo of codigos) {
            expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
        }
    });

    it("o hash não deixa ver o código e não muda com hífen, espaço ou caixa", () => {
        const hash = hashCodigoDeRecuperacao("ABCDE-FGHJK");

        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        expect(hash).not.toContain("ABCDE");
        expect(hashCodigoDeRecuperacao("abcde fghjk")).toBe(hash);
        expect(hashCodigoDeRecuperacao("ABCDEFGHJK")).toBe(hash);
    });

    it("o hash depende da chave: com outra chave o mesmo código gera outro valor", () => {
        const hash = hashCodigoDeRecuperacao("ABCDE-FGHJK");

        env.mfa.chaveCifra = "c".repeat(48);

        expect(hashCodigoDeRecuperacao("ABCDE-FGHJK")).not.toBe(hash);
    });

    it("reconhece o que parece um código de recuperação", () => {
        expect(pareceCodigoDeRecuperacao("ABCDE-FGHJK")).toBe(true);
        expect(pareceCodigoDeRecuperacao("abcdefghjk")).toBe(true);
        expect(pareceCodigoDeRecuperacao("123456")).toBe(false);
        expect(pareceCodigoDeRecuperacao("ABCDE-FGHJ0")).toBe(false);
        expect(pareceCodigoDeRecuperacao("")).toBe(false);
    });

    it("normaliza para comparar", () => {
        expect(normalizarCodigoDeRecuperacao(" abcde-fghjk ")).toBe("ABCDEFGHJK");
    });
});
