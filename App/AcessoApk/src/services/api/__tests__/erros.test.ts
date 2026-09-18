import { AxiosError } from "axios";

import { extrairMensagemErro } from "../erros";

function criarAxiosError(data: unknown, comResposta = true) {
  const erro = new AxiosError("Request failed");
  if (comResposta) {
    erro.response = { data, status: 400, statusText: "", headers: {}, config: {} as never };
  }
  return erro;
}

describe("extrairMensagemErro", () => {
  it("prioriza a mensagem de erro de validação de um campo específico", () => {
    const erro = criarAxiosError({ mensagem: "Erro de validação.", erros: [{ campo: "email", mensagem: "Informe um e-mail válido." }] });
    expect(extrairMensagemErro(erro, "padrão")).toBe("Informe um e-mail válido.");
  });

  it("usa o campo 'mensagem' (não 'msg') do item de erro — nome real confirmado na auditoria do backend", () => {
    const erro = criarAxiosError({ erros: [{ campo: "senha", msg: "nome de campo errado, não deve ser lido" }] });
    expect(extrairMensagemErro(erro, "padrão")).toBe("padrão");
  });

  it("sem erro de campo, usa a mensagem geral da API", () => {
    const erro = criarAxiosError({ mensagem: "E-mail ou senha inválidos." });
    expect(extrairMensagemErro(erro, "padrão")).toBe("E-mail ou senha inválidos.");
  });

  it("sem nada aproveitável no corpo, usa a mensagem padrão do chamador", () => {
    const erro = criarAxiosError({});
    expect(extrairMensagemErro(erro, "Não foi possível entrar.")).toBe("Não foi possível entrar.");
  });

  it("sem resposta do servidor (erro de rede), mostra uma mensagem de conexão fixa", () => {
    const erro = criarAxiosError(undefined, false);
    expect(extrairMensagemErro(erro, "padrão")).toBe(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  });

  it("um erro que não é do axios sempre cai na mensagem padrão (nunca vaza detalhe técnico)", () => {
    expect(extrairMensagemErro(new Error("stack trace sensível"), "padrão")).toBe("padrão");
    expect(extrairMensagemErro("string qualquer", "padrão")).toBe("padrão");
    expect(extrairMensagemErro(null, "padrão")).toBe("padrão");
  });
});
