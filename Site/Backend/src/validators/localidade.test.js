import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { campoEstado, campoPais } from "./camposPessoais.js";
import { validarCadastroCandidato, validarCadastroEmpresa } from "./autenticacaoValidator.js";
import { validarAtualizacaoCandidato } from "./candidatoValidator.js";
import { CODIGOS_DE_PAIS, SIGLAS_DE_ESTADO, ehCodigoDePais, ehSiglaDeEstado } from "../utils/localidades.js";

async function rodar(regras, corpo, params = {}) {
    const req = { body: { ...corpo }, params, query: {}, headers: {} };

    for (const regra of regras) {
        await regra.run(req);
    }

    const erros = validationResult(req).array();

    return { campos: erros.map((e) => e.path), mensagens: erros.map((e) => e.msg), corpo: req.body };
}

const ID = "11111111-1111-4111-8111-111111111111";

describe("listas de localidade", () => {
    it("tem os 249 códigos ISO 3166-1 alpha-2 e as 27 UFs", () => {
        expect(CODIGOS_DE_PAIS.size).toBe(249);
        expect(SIGLAS_DE_ESTADO.size).toBe(27);
    });

    it.each(["BR", "br", "US", "PT", "WF", "SX"])("%s é país", (codigo) => expect(ehCodigoDePais(codigo)).toBe(true));
    it.each(["QQ", "XX", "BRA", "B", "", "1A", "UK"])("%j não é país", (codigo) => expect(ehCodigoDePais(codigo)).toBe(false));
    it.each(["SP", "sp", "DF", "TO"])("%s é estado", (sigla) => expect(ehSiglaDeEstado(sigla)).toBe(true));
    it.each(["ZZ", "XX", "SPP", "S", ""])("%j não é estado", (sigla) => expect(ehSiglaDeEstado(sigla)).toBe(false));
});

describe("campoPais", () => {
    it("normaliza para maiúsculas e aceita código existente", async () => {
        const { campos, corpo } = await rodar([campoPais()], { pais: " br " });

        expect(campos).toEqual([]);
        expect(corpo.pais).toBe("BR");
    });

    it.each(["QQ", "Brasil", "BRA", "12"])("recusa %j", async (pais) => {
        expect((await rodar([campoPais()], { pais })).campos).toEqual(["pais"]);
    });

    it("opcional aceita a ausência; obrigatório não", async () => {
        expect((await rodar([campoPais()], {})).campos).toEqual([]);
        expect((await rodar([campoPais({ obrigatorio: true })], {})).campos).toEqual(["pais"]);
    });
});

describe("campoEstado", () => {
    it("no Brasil, recusa sigla que não é de estado", async () => {
        const { campos, mensagens } = await rodar([campoPais(), campoEstado()], { pais: "br", estado: "zz" });

        expect(campos).toEqual(["estado"]);
        expect(mensagens[0]).toBe("Escolha um estado da lista.");
    });

    it("no Brasil, aceita sigla válida em qualquer caixa e grava em maiúsculas", async () => {
        const { campos, corpo } = await rodar([campoPais(), campoEstado()], { pais: "BR", estado: "sp" });

        expect(campos).toEqual([]);
        expect(corpo.estado).toBe("SP");
    });

    it("fora do Brasil, só confere o formato de 2 letras", async () => {
        expect((await rodar([campoPais(), campoEstado()], { pais: "US", estado: "ZZ" })).campos).toEqual([]);
        expect((await rodar([campoPais(), campoEstado()], { pais: "US", estado: "Texas" })).campos).toEqual(["estado"]);
    });
});

describe("rotas", () => {
    const candidato = {
        nome: "Maria da Silva",
        email: "maria@exemplo.com",
        senha: "Senha@1234",
        telefone: "11999998888",
        cpf: "529.982.247-25",
        pais: "BR",
        dataNascimento: "1990-05-20",
        cidade: "São Paulo",
        estado: "SP"
    };

    it("cadastro de candidato: aceita Brasil + SP e recusa país inexistente e UF inexistente", async () => {
        expect((await rodar(validarCadastroCandidato, candidato)).campos).toEqual([]);
        expect((await rodar(validarCadastroCandidato, { ...candidato, pais: "QQ" })).campos).toContain("pais");
        expect((await rodar(validarCadastroCandidato, { ...candidato, estado: "ZZ" })).campos).toEqual(["estado"]);
    });

    it("cadastro de candidato: morando fora do Brasil, a região de 2 letras é aceita", async () => {
        expect((await rodar(validarCadastroCandidato, { ...candidato, pais: "US", estado: "TX" })).campos).toEqual([]);
    });

    it("cadastro de empresa: país opcional, mas se vier tem de existir", async () => {
        const empresa = {
            nome: "Responsável Teste",
            email: "empresa@exemplo.com",
            senha: "Senha@1234",
            cnpj: "12345678000199",
            razaoSocial: "Empresa Teste Ltda"
        };

        expect((await rodar(validarCadastroEmpresa, empresa)).campos).toEqual([]);
        expect((await rodar(validarCadastroEmpresa, { ...empresa, pais: "QQ" })).campos).toEqual(["pais"]);
    });

    it("edição de candidato: país e estado só são conferidos quando enviados", async () => {
        expect((await rodar(validarAtualizacaoCandidato, {}, { id: ID })).campos).toEqual([]);
        expect((await rodar(validarAtualizacaoCandidato, { pais: "BR", estado: "SP" }, { id: ID })).campos).toEqual([]);
        expect((await rodar(validarAtualizacaoCandidato, { pais: "BR", estado: "ZZ" }, { id: ID })).campos).toEqual(["estado"]);
        expect((await rodar(validarAtualizacaoCandidato, { pais: "QQ" }, { id: ID })).campos).toEqual(["pais"]);
    });
});
