import { describe, expect, it } from "vitest";

import { ehEmailJaCadastrado } from "./erroDeEmailRepetido";

const resposta = (status: number, data: unknown) => ({ response: { status, data } });

describe("ehEmailJaCadastrado", () => {
  it("reconhece o 409 com a frase do e-mail no corpo da resposta", () => {
    expect(ehEmailJaCadastrado(resposta(409, { mensagem: "Este e-mail já está cadastrado." }))).toBe(true);
  });

  it("reconhece o 409 cujo erro é do campo email", () => {
    expect(ehEmailJaCadastrado(resposta(409, { mensagem: "Conflito", erros: [{ campo: "email", mensagem: "x" }] }))).toBe(true);
  });

  it("um 409 de CPF repetido não é de e-mail (a saída seria o lugar errado)", () => {
    expect(ehEmailJaCadastrado(resposta(409, { mensagem: "Este CPF já está cadastrado.", erros: [{ campo: "cpf" }] }))).toBe(false);
  });

  it("outro status com a palavra e-mail também não conta", () => {
    expect(ehEmailJaCadastrado(resposta(400, { mensagem: "E-mail inválido" }))).toBe(false);
  });

  it.each([null, undefined, new Error("rede"), "texto"])("erro sem resposta (%s) não conta", (erro) => {
    expect(ehEmailJaCadastrado(erro)).toBe(false);
  });
});
