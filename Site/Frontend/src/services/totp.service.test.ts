import { describe, it, expect, vi, beforeEach } from "vitest";

const { api, definirTokens } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  definirTokens: vi.fn(),
}));

vi.mock("./api", () => ({
  default: api,
  definirTokens,
  extrairMensagemErro: (erro: { response?: { data?: { mensagem?: string } } }, padrao: string) =>
    erro?.response?.data?.mensagem ?? padrao,
}));

const { totpService, codigoDoErroTotp, desafioVenceu, mensagemDeErroTotp } = await import("./totp.service");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("concluirLogin (passo 2 do login)", () => {
  it("manda o desafio e o código a /auth/login/totp", async () => {
    api.post.mockResolvedValue({ data: { token: "t", refreshToken: "r", usuario: {} } });

    await totpService.concluirLogin("desafio-1", "123456");

    expect(api.post).toHaveBeenCalledWith("/auth/login/totp", { desafio: "desafio-1", codigo: "123456" });
  });

  it("com sessão na resposta, guarda os tokens como o login faz", async () => {
    api.post.mockResolvedValue({ data: { token: "t", refreshToken: "r", usuario: {} } });

    await totpService.concluirLogin("d", "123456");

    expect(definirTokens).toHaveBeenCalledWith("t", "r");
  });

  it("conta pausada (sem sessão) não grava token nenhum", async () => {
    api.post.mockResolvedValue({ data: { contaPausada: true } });

    const r = await totpService.concluirLogin("d", "123456");

    expect(r).toEqual({ contaPausada: true });
    expect(definirTokens).not.toHaveBeenCalled();
  });
});

describe("ativar", () => {
  it("troca os tokens pela sessão nova (as outras sessões foram encerradas) e devolve só os códigos", async () => {
    api.post.mockResolvedValue({ data: { codigosRecuperacao: ["AAAAA-BBBBB"], token: "novo", refreshToken: "novo-r" } });

    const r = await totpService.ativar("selo", "123456");

    expect(api.post).toHaveBeenCalledWith("/auth/totp/ativar", { configuracao: "selo", codigo: "123456" });
    expect(definirTokens).toHaveBeenCalledWith("novo", "novo-r");
    expect(r).toEqual({ codigosRecuperacao: ["AAAAA-BBBBB"] });
    expect(JSON.stringify(r)).not.toContain("novo-r");
  });
});

describe("demais chamadas", () => {
  it("estado lê /auth/totp", async () => {
    api.get.mockResolvedValue({ data: { mfaDisponivel: true, mfaConfigurado: false, mfaExigido: false, codigosRestantes: 0, confirmadoEm: null } });

    expect((await totpService.estado()).mfaDisponivel).toBe(true);
    expect(api.get).toHaveBeenCalledWith("/auth/totp");
  });

  it("iniciar sem reautenticação manda corpo vazio; na troca, manda senha e código", async () => {
    api.post.mockResolvedValue({ data: { segredo: "S", configuracao: "c", uri: "u", segredoAgrupado: "S", troca: false } });

    await totpService.iniciar();
    await totpService.iniciar({ senhaAtual: "x", codigo: "123456" });

    expect(api.post).toHaveBeenNthCalledWith(1, "/auth/totp/configurar", {});
    expect(api.post).toHaveBeenNthCalledWith(2, "/auth/totp/configurar", { senhaAtual: "x", codigo: "123456" });
  });

  it("regenerarCodigos devolve a lista; desativar chama a rota certa", async () => {
    api.post.mockResolvedValueOnce({ data: { codigosRecuperacao: ["A", "B"] } }).mockResolvedValueOnce({ data: {} });

    expect(await totpService.regenerarCodigos({ codigo: "123456" })).toEqual(["A", "B"]);
    await totpService.desativar({ senhaAtual: "x", codigo: "123456" });

    expect(api.post).toHaveBeenNthCalledWith(1, "/auth/totp/codigos-recuperacao", { codigo: "123456" });
    expect(api.post).toHaveBeenNthCalledWith(2, "/auth/totp/desativar", { senhaAtual: "x", codigo: "123456" });
  });
});

describe("erros", () => {
  const erro = (codigo: string, mensagem = "texto do servidor") => ({ response: { data: { mensagem, detalhes: { codigo } } } });

  it("lê o código do erro, nunca o texto", () => {
    expect(codigoDoErroTotp(erro("MFA_ESPERA"))).toBe("MFA_ESPERA");
    expect(codigoDoErroTotp(new Error("rede"))).toBeUndefined();
  });

  it("desafio vencido é reconhecido pelo código", () => {
    expect(desafioVenceu(erro("MFA_DESAFIO_EXPIRADO"))).toBe(true);
    expect(desafioVenceu(erro("MFA_CODIGO_INVALIDO"))).toBe(false);
  });

  it("a mensagem vem do servidor; sem ela, cai no texto padrão", () => {
    expect(mensagemDeErroTotp(erro("MFA_ESPERA", "Tente de novo em 5 minutos."))).toBe("Tente de novo em 5 minutos.");
    expect(mensagemDeErroTotp(new Error("rede"), "Falha de rede.")).toBe("Falha de rede.");
  });
});
