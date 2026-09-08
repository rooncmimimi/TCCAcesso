import { AxiosError } from "axios";

import { getFriendlyErrorMessage } from "../errors";

function criarAxiosError(data: unknown, comResposta = true) {
  const erro = new AxiosError("Request failed");
  if (comResposta) {
    erro.response = { data, status: 400, statusText: "", headers: {}, config: {} as never };
  }
  return erro;
}

describe("getFriendlyErrorMessage", () => {
  it("prioriza a mensagem de erro de validação de um campo específico", () => {
    const erro = criarAxiosError({ mensagem: "Erro de validação.", erros: [{ campo: "email", mensagem: "Informe um e-mail válido." }] });
    expect(getFriendlyErrorMessage(erro, "padrão")).toBe("Informe um e-mail válido.");
  });

  it("usa o campo 'mensagem' (não 'msg') do item de erro — nome real confirmado na auditoria do backend", () => {
    const erro = criarAxiosError({ erros: [{ campo: "senha", msg: "nome de campo errado, não deve ser lido" }] });
    expect(getFriendlyErrorMessage(erro, "padrão")).toBe("padrão");
  });

  it("sem erro de campo, usa a mensagem geral da API", () => {
    const erro = criarAxiosError({ mensagem: "E-mail ou senha inválidos." });
    expect(getFriendlyErrorMessage(erro, "padrão")).toBe("E-mail ou senha inválidos.");
  });

  it("sem nada aproveitável no corpo, usa a mensagem padrão do chamador", () => {
    const erro = criarAxiosError({});
    expect(getFriendlyErrorMessage(erro, "Não foi possível entrar.")).toBe("Não foi possível entrar.");
  });

  it("sem resposta do servidor (erro de rede), mostra uma mensagem de conexão fixa", () => {
    const erro = criarAxiosError(undefined, false);
    expect(getFriendlyErrorMessage(erro, "padrão")).toBe(
      "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    );
  });

  it("um erro que não é do axios sempre cai na mensagem padrão (nunca vaza detalhe técnico)", () => {
    expect(getFriendlyErrorMessage(new Error("stack trace sensível"), "padrão")).toBe("padrão");
    expect(getFriendlyErrorMessage("string qualquer", "padrão")).toBe("padrão");
    expect(getFriendlyErrorMessage(null, "padrão")).toBe("padrão");
  });
});
