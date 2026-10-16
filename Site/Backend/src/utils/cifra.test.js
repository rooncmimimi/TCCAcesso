import { describe, it, expect, vi } from "vitest";

const { env } = vi.hoisted(() => ({ env: { jwt: { secret: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres" } } }));

vi.mock("../config/env.js", () => ({ default: env }));

const { cifrar, decifrar } = await import("./cifra.js");

describe("cifrar e decifrar", () => {
    it("devolve o texto original", () => {
        expect(decifrar(cifrar("verificador-secreto", "uso-a"), "uso-a")).toBe("verificador-secreto");
    });

    it("guarda textos com acentos e símbolos", () => {
        const texto = "açaí ~ _ - . ÃÕ";
        expect(decifrar(cifrar(texto, "uso-a"), "uso-a")).toBe(texto);
    });

    it("o valor cifrado não mostra o texto, nem em base64", () => {
        const cifrado = cifrar("verificador-secreto-123", "uso-a");

        expect(cifrado).not.toContain("verificador");
        expect(Buffer.from(cifrado, "base64url").toString("utf8")).not.toContain("verificador");
    });

    it("usa só caracteres que cabem num JWT e numa URL (base64url)", () => {
        expect(cifrar("x".repeat(100), "uso-a")).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("cada chamada gera um valor diferente (IV novo), mesmo para o mesmo texto", () => {
        expect(cifrar("igual", "uso-a")).not.toBe(cifrar("igual", "uso-a"));
    });

    it("não abre em outro contexto", () => {
        expect(() => decifrar(cifrar("segredo", "uso-a"), "uso-b")).toThrow();
    });

    it("não abre com outro JWT_SECRET", () => {
        const cifrado = cifrar("segredo", "uso-a");
        const original = env.jwt.secret;
        env.jwt.secret = "outro-segredo-qualquer-com-bastante-tamanho-aqui";

        try {
            expect(() => decifrar(cifrado, "uso-a")).toThrow();
        } finally {
            env.jwt.secret = original;
        }
    });

    it("recusa um valor alterado (a autenticação do GCM pega até um byte)", () => {
        const bruto = Buffer.from(cifrar("segredo", "uso-a"), "base64url");
        bruto[bruto.length - 1] ^= 1;

        expect(() => decifrar(bruto.toString("base64url"), "uso-a")).toThrow();
    });

    it("recusa a etiqueta alterada", () => {
        const bruto = Buffer.from(cifrar("segredo", "uso-a"), "base64url");
        bruto[13] ^= 1;

        expect(() => decifrar(bruto.toString("base64url"), "uso-a")).toThrow();
    });

    it.each([[undefined], [null], [""], ["curto"], ["!!!"], [12345]])("recusa o valor %j", (valor) => {
        expect(() => decifrar(valor, "uso-a")).toThrow();
    });
});
