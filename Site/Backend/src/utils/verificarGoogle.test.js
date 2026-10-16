import { describe, it, expect } from "vitest";

import { classificarErroDaTroca, classificarPaginaDeAutorizacao } from "./verificarGoogle.js";

/**
 * Como `npm run google:verificar` lê as respostas do Google, sem a rede. Os endereços e códigos de
 * erro vêm do que o Google respondeu de fato em 2026-10-16 (ver a nota técnica de configuração).
 */

describe("classificarPaginaDeAutorizacao", () => {
    it.each([
        ["https://accounts.google.com/v3/signin/identifier?opparams=%253F&flowName=GeneralOAuthFlow"],
        ["https://accounts.google.com/signin/oauth/consent?authuser=0"],
        ["https://accounts.google.com/accountchooser?continue=x"]
    ])("a tela de login ou de consentimento quer dizer que o endereço de retorno está cadastrado (%s)", (url) => {
        expect(classificarPaginaDeAutorizacao(url)).toBe("aceito");
    });

    it("a página de erro quer dizer que o endereço de retorno NÃO está cadastrado", () => {
        expect(
            classificarPaginaDeAutorizacao("https://accounts.google.com/signin/oauth/error?authError=Cg9yZWRpcmVjdF91cmlfbWlzbWF0Y2g&flowName=GeneralOAuthFlow")
        ).toBe("recusado");
    });

    it.each([["https://accounts.google.com/outra/pagina"], ["https://example.com/"], ["isto não é uma URL"], [""], [undefined]])(
        "não arrisca um veredito para %j",
        (url) => {
            expect(classificarPaginaDeAutorizacao(url)).toBe("desconhecido");
        }
    );

    it("só olha o caminho, não o que vem na query (um texto 'error' solto não vira recusa)", () => {
        expect(classificarPaginaDeAutorizacao("https://accounts.google.com/v3/signin/identifier?x=/signin/oauth/error")).toBe("aceito");
    });
});

describe("classificarErroDaTroca", () => {
    const doGoogle = (error) => Object.assign(new Error("Request failed with status code 400"), { response: { data: { error } } });

    it("invalid_grant: o Google aceitou o ID e o segredo e só recusou o código inventado", () => {
        expect(classificarErroDaTroca(doGoogle("invalid_grant"))).toBe("aceito");
    });

    it.each(["invalid_client", "unauthorized_client"])("%s: o Google recusou o ID ou o segredo", (codigo) => {
        expect(classificarErroDaTroca(doGoogle(codigo))).toBe("recusado");
    });

    it("sem resposta (falha de rede ou tempo esgotado): não dá para concluir", () => {
        expect(classificarErroDaTroca(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }))).toBe("sem-resposta");
        expect(classificarErroDaTroca(undefined)).toBe("sem-resposta");
    });

    it.each([["redirect_uri_mismatch"], ["invalid_request"], [undefined]])("%s: não é o que se esperava, fica como desconhecido", (codigo) => {
        expect(classificarErroDaTroca(doGoogle(codigo))).toBe("desconhecido");
    });
});
