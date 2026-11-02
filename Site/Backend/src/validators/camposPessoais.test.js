import { describe, it, expect } from "vitest";
import { validationResult } from "express-validator";

import { campoCpf, campoDataNascimento, campoNome } from "./camposPessoais.js";
import { validarCadastroCandidato } from "./autenticacaoValidator.js";
import { validarAtualizacaoCandidato } from "./candidatoValidator.js";
import { validarAtualizacaoUsuario } from "./usuarioValidator.js";

/** Roda a cadeia real do express-validator sobre um corpo e devolve o que foi rejeitado e o corpo já sanitizado. */
async function rodar(regras, corpo, params = {}) {
    const req = { body: { ...corpo }, params, query: {}, headers: {} };

    for (const regra of regras) {
        await regra.run(req);
    }

    const erros = validationResult(req).array();

    return { campos: erros.map((e) => e.path), mensagens: erros.map((e) => e.msg), corpo: req.body };
}

const ID = "11111111-1111-4111-8111-111111111111";

describe("campoCpf", () => {
    it("aceita com e sem pontuação e grava só os dígitos", async () => {
        const mascarado = await rodar([campoCpf()], { cpf: "529.982.247-25" });
        const limpo = await rodar([campoCpf()], { cpf: "52998224725" });

        expect(mascarado.campos).toEqual([]);
        expect(mascarado.corpo.cpf).toBe("52998224725");
        expect(limpo.corpo.cpf).toBe("52998224725");
    });

    it.each(["123.456.789-00", "111.111.111-11", "000.00000000", "1234"])("recusa %s sem repetir o número na mensagem", async (cpf) => {
        const { campos, mensagens } = await rodar([campoCpf()], { cpf });

        expect(campos).toEqual(["cpf"]);
        expect(mensagens).toEqual(["Informe um CPF válido."]);
        expect(mensagens.join(" ")).not.toContain(cpf.replace(/\D/g, "") || "x");
    });

    it("não exige o CPF quando é opcional, mas exige quando é obrigatório", async () => {
        expect((await rodar([campoCpf()], {})).campos).toEqual([]);
        expect((await rodar([campoCpf()], { cpf: "" })).campos).toEqual([]);
        expect((await rodar([campoCpf({ obrigatorio: true })], {})).campos).toEqual(["cpf"]);
    });

    it("recusa valor que não é texto", async () => {
        expect((await rodar([campoCpf()], { cpf: 52998224725 })).campos).toEqual(["cpf"]);
    });
});

describe("campoNome", () => {
    it("aceita nomes reais e devolve o nome normalizado", async () => {
        const { campos, corpo } = await rodar([campoNome()], { nome: "  João   D’Ávila  dos  Santos " });

        expect(campos).toEqual([]);
        expect(corpo.nome).toBe("João D’Ávila dos Santos");
    });

    it.each(["Ana1 Souza", "Ana@Souza", "Ab", "João 😀", ""])("recusa %j", async (nome) => {
        expect((await rodar([campoNome()], { nome })).campos).toEqual(["nome"]);
    });

    it("em modo opcional aceita a ausência, mas ainda valida quando vem", async () => {
        expect((await rodar([campoNome("nome", { opcional: true })], {})).campos).toEqual([]);
        expect((await rodar([campoNome("nome", { opcional: true })], { nome: "X1" })).campos).toEqual(["nome"]);
    });
});

describe("campoDataNascimento", () => {
    it.each([
        ["2026-02-30", "não existe no calendário"],
        ["2999-01-01", "futuro"],
        ["0001-01-01", "digitada errado"],
        ["2020-01-01", "16 anos"],
        ["20/05/1990", "AAAA-MM-DD"]
    ])("recusa %s com mensagem que explica o motivo", async (dataNascimento, trecho) => {
        const { campos, mensagens } = await rodar([campoDataNascimento({ obrigatorio: true })], { dataNascimento });

        expect(campos).toEqual(["dataNascimento"]);
        expect(mensagens[0]).toContain(trecho);
    });

    it("aceita uma data válida e profissionais 50+", async () => {
        for (const dataNascimento of ["1990-05-20", "1962-03-10", "1948-12-01"]) {
            expect((await rodar([campoDataNascimento({ obrigatorio: true })], { dataNascimento })).campos).toEqual([]);
        }
    });
});

describe("validadores de rota que usam os campos pessoais", () => {
    const cadastroBase = {
        nome: "Maria da Silva",
        email: "maria@exemplo.com",
        senha: "Senha@1234",
        telefone: "11999998888",
        cpf: "529.982.247-25",
        pais: "br",
        dataNascimento: "1990-05-20",
        cidade: "São Paulo",
        estado: "sp"
    };

    it("cadastro de candidato: aceita o corpo válido e entrega CPF só com dígitos", async () => {
        const { campos, corpo } = await rodar(validarCadastroCandidato, cadastroBase);

        expect(campos).toEqual([]);
        expect(corpo.cpf).toBe("52998224725");
        expect(corpo.pais).toBe("BR");
    });

    it("cadastro de candidato: recusa CPF de dígitos iguais, nome com número e data inexistente", async () => {
        const { campos } = await rodar(validarCadastroCandidato, {
            ...cadastroBase,
            cpf: "111.111.111-11",
            nome: "Maria 2",
            dataNascimento: "2026-02-30"
        });

        expect(campos.sort()).toEqual(["cpf", "dataNascimento", "nome"]);
    });

    it("edição de candidato: valida CPF e data quando enviados e ignora quando ausentes", async () => {
        expect((await rodar(validarAtualizacaoCandidato, {}, { id: ID })).campos).toEqual([]);
        expect(
            (await rodar(validarAtualizacaoCandidato, { cpf: "123", dataNascimento: "1999-02-31" }, { id: ID })).campos.sort()
        ).toEqual(["cpf", "dataNascimento"]);
    });

    it("edição de usuário: nome com caracteres inválidos é recusado e o válido, normalizado", async () => {
        expect((await rodar(validarAtualizacaoUsuario, { nome: "Maria $$$" }, { id: ID })).campos).toEqual(["nome"]);

        const ok = await rodar(validarAtualizacaoUsuario, { nome: "  Ana   Maria  " }, { id: ID });

        expect(ok.campos).toEqual([]);
        expect(ok.corpo.nome).toBe("Ana Maria");
    });
});
