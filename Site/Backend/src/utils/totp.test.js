import { describe, it, expect } from "vitest";

import {
    agruparSegredo,
    codificarBase32,
    codigoDoPasso,
    decodificarBase32,
    encontrarPassoValido,
    gerarSegredoBase32,
    gerarUriOtpAuth,
    passoDoInstante
} from "./totp.js";

/**
 * Vetores oficiais da RFC 6238 (apêndice B), SHA-1, segredo "12345678901234567890". A RFC publica o
 * código de 8 dígitos; o de 6 dígitos que os aplicativos mostram são os 6 últimos.
 */
const SEGREDO_RFC = codificarBase32(Buffer.from("12345678901234567890"));

describe("TOTP: vetores da RFC 6238", () => {
    it.each([
        [59, "287082"],
        [1111111109, "081804"],
        [1111111111, "050471"],
        [1234567890, "005924"],
        [2000000000, "279037"],
        [20000000000, "353130"]
    ])("no instante %i o código é %s", (segundos, esperado) => {
        expect(codigoDoPasso(SEGREDO_RFC, passoDoInstante(segundos * 1000))).toBe(esperado);
    });
});

describe("base32", () => {
    it("ida e volta preserva os bytes", () => {
        const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 17]);

        expect(decodificarBase32(codificarBase32(bytes))).toEqual(bytes);
    });

    it("ignora espaços e minúsculas ao ler o segredo digitado", () => {
        expect(decodificarBase32("gezd gnbv gy3t qojq gezd gnbv gy3t qojq")).toEqual(Buffer.from("12345678901234567890"));
    });

    it("o segredo novo tem 160 bits e é diferente a cada vez", () => {
        const a = gerarSegredoBase32();

        expect(a).toMatch(/^[A-Z2-7]{32}$/);
        expect(a).not.toBe(gerarSegredoBase32());
    });

    it("agrupa em quatro para digitar sem errar", () => {
        expect(agruparSegredo("ABCDEFGHIJKLMNOP")).toBe("ABCD EFGH IJKL MNOP");
    });
});

describe("encontrarPassoValido", () => {
    const agora = 1_700_000_000_000;
    const atual = passoDoInstante(agora);

    it("aceita o código do intervalo atual e devolve qual intervalo foi", () => {
        expect(encontrarPassoValido(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, atual), { agora })).toBe(atual);
    });

    it("tolera um intervalo para cada lado (relógio do celular desajustado)", () => {
        expect(encontrarPassoValido(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, atual - 1), { agora })).toBe(atual - 1);
        expect(encontrarPassoValido(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, atual + 1), { agora })).toBe(atual + 1);
    });

    it("recusa dois intervalos de distância", () => {
        expect(encontrarPassoValido(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, atual - 2), { agora })).toBeNull();
        expect(encontrarPassoValido(SEGREDO_RFC, codigoDoPasso(SEGREDO_RFC, atual + 2), { agora })).toBeNull();
    });

    it("aceita o código com espaço no meio, como o aplicativo mostra (123 456)", () => {
        const codigo = codigoDoPasso(SEGREDO_RFC, atual);

        expect(encontrarPassoValido(SEGREDO_RFC, `${codigo.slice(0, 3)} ${codigo.slice(3)}`, { agora })).toBe(atual);
    });

    it.each([["abcdef"], ["12345"], ["1234567"], [""], [null], [undefined], ["12 3"]])("recusa formato inválido (%j)", (codigo) => {
        expect(encontrarPassoValido(SEGREDO_RFC, codigo, { agora })).toBeNull();
    });

    it("recusa código de outro segredo", () => {
        const outro = gerarSegredoBase32();

        expect(encontrarPassoValido(SEGREDO_RFC, codigoDoPasso(outro, atual), { agora })).toBeNull();
    });
});

describe("gerarUriOtpAuth", () => {
    it("monta o endereço que o aplicativo autenticador abre", () => {
        const uri = new URL(gerarUriOtpAuth("ABCDEFGH", "ana@exemplo.com", "ACESSO"));

        expect(uri.protocol).toBe("otpauth:");
        expect(uri.host).toBe("totp");
        expect(decodeURIComponent(uri.pathname)).toBe("/ACESSO:ana@exemplo.com");
        expect(uri.searchParams.get("secret")).toBe("ABCDEFGH");
        expect(uri.searchParams.get("issuer")).toBe("ACESSO");
        expect(uri.searchParams.get("digits")).toBe("6");
        expect(uri.searchParams.get("period")).toBe("30");
        expect(uri.searchParams.get("algorithm")).toBe("SHA1");
    });
});
