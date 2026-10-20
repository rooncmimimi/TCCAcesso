import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { validarCadastroCandidato, validarCadastroEmpresa, validarIdioma } from "./autenticacaoValidator.js";

const validar = async (cadeia, body) => {
    const req = { body };
    await Promise.all(cadeia.map((regra) => regra.run(req)));

    return validationResult(req)
        .array()
        .map((erro) => ({ campo: erro.path, mensagem: erro.msg }));
};

const CANDIDATO = {
    nome: "Ana Souza",
    email: "ana@exemplo.com",
    senha: "Senha@123",
    telefone: "11999999999",
    cpf: "52998224725",
    pais: "BR",
    dataNascimento: "1990-01-01",
    cidade: "Recife",
    estado: "PE"
};

const EMPRESA = {
    nome: "Acme",
    email: "contato@acme.com",
    senha: "Senha@123",
    cnpj: "11222333000181",
    razaoSocial: "Acme Ltda"
};

describe("PATCH /auth/idioma", () => {
    it.each(["pt", "en", "es"])("aceita %s", async (idioma) => {
        expect(await validar(validarIdioma, { idioma })).toEqual([]);
    });

    it.each([undefined, "", "fr", "pt-BR", "EN", 1, null, ["en"]])("recusa %j", async (idioma) => {
        const erros = await validar(validarIdioma, { idioma });

        expect(erros.length).toBeGreaterThan(0);
        expect(erros.at(-1)).toEqual({ campo: "idioma", mensagem: "Idioma inválido. Use pt, en ou es." });
    });
});

describe("idioma no cadastro", () => {
    it("é opcional no candidato e na empresa (o app Android não manda)", async () => {
        expect(await validar(validarCadastroCandidato, CANDIDATO)).toEqual([]);
        expect(await validar(validarCadastroEmpresa, EMPRESA)).toEqual([]);
    });

    it("aceita os três idiomas", async () => {
        for (const idioma of ["pt", "en", "es"]) {
            expect(await validar(validarCadastroCandidato, { ...CANDIDATO, idioma })).toEqual([]);
            expect(await validar(validarCadastroEmpresa, { ...EMPRESA, idioma })).toEqual([]);
        }
    });

    it("recusa idioma que a plataforma não tem", async () => {
        expect(await validar(validarCadastroCandidato, { ...CANDIDATO, idioma: "fr" })).toEqual([
            { campo: "idioma", mensagem: "Idioma inválido. Use pt, en ou es." }
        ]);
        expect(await validar(validarCadastroEmpresa, { ...EMPRESA, idioma: "de" })).toEqual([
            { campo: "idioma", mensagem: "Idioma inválido. Use pt, en ou es." }
        ]);
    });
});
