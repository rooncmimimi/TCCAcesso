import { describe, it, expect, vi, beforeEach } from "vitest";

const { api, guardarDispositivoConfiavel } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  guardarDispositivoConfiavel: vi.fn(),
}));

vi.mock("./api", () => ({
  default: api,
  guardarDispositivoConfiavel,
  extrairMensagemErro: (erro: { response?: { data?: { mensagem?: string } } }, padrao: string) => erro?.response?.data?.mensagem ?? padrao,
}));

const { segurancaService, codigoDoErroSeguranca, desafioDeDispositivoVenceu, mensagemDeErroSeguranca, segundosDeEspera } = await import("./seguranca.service");

const erro = (codigo: string, extra: Record<string, unknown> = {}, mensagem = "falhou") => ({ response: { data: { mensagem, detalhes: { codigo, ...extra } } } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("estado", () => {
  it("devolve o que o servidor diz", async () => {
    api.get.mockResolvedValue({ data: { habilitado: true, ativo: false } });

    expect(await segurancaService.estado()).toEqual({ habilitado: true, ativo: false });
    expect(api.get).toHaveBeenCalledWith("/auth/seguranca/disponivel");
  });

  it("qualquer falha vira 'desligado' (as telas novas simplesmente não aparecem)", async () => {
    api.get.mockRejectedValue(new Error("fora do ar"));

    expect(await segurancaService.estado()).toEqual({ habilitado: false, ativo: false });
  });
});

describe("concluirLogin", () => {
  it("manda desafio, código e a escolha de lembrar", async () => {
    api.post.mockResolvedValue({ data: { token: "t", refreshToken: "r", usuario: {} } });

    await segurancaService.concluirLogin("d", "123456", true);

    expect(api.post).toHaveBeenCalledWith("/auth/login/dispositivo", { desafio: "d", codigo: "123456", lembrar: true });
  });

  it("com token de aparelho na resposta, guarda para as próximas requisições", async () => {
    api.post.mockResolvedValue({ data: { token: "t", refreshToken: "r", usuario: {}, dispositivo: "token-do-aparelho" } });

    await segurancaService.concluirLogin("d", "123456", true);

    expect(guardarDispositivoConfiavel).toHaveBeenCalledWith("token-do-aparelho");
  });

  it("sem token de aparelho (não pediu para lembrar, ou conta pausada), não grava nada", async () => {
    api.post.mockResolvedValue({ data: { token: "t", refreshToken: "r", usuario: {} } });
    await segurancaService.concluirLogin("d", "123456", false);

    api.post.mockResolvedValue({ data: { contaPausada: true } });
    await segurancaService.concluirLogin("d", "123456", true);

    expect(guardarDispositivoConfiavel).not.toHaveBeenCalled();
  });
});

describe("os demais pedidos", () => {
  it("reenviar, listar, remover e histórico usam as rotas certas", async () => {
    api.post.mockResolvedValue({ data: { desafioDispositivo: "novo", reenvioEmSegundos: 60, quantidade: 3 } });
    api.get.mockResolvedValue({ data: { dispositivos: [{ id: "a" }], eventos: [{ id: "e" }] } });
    api.delete.mockResolvedValue({});

    expect(await segurancaService.reenviarCodigo("d")).toEqual({ desafioDispositivo: "novo", reenvioEmSegundos: 60, quantidade: 3 });
    expect(api.post).toHaveBeenCalledWith("/auth/login/dispositivo/reenviar", { desafio: "d" });
    expect(await segurancaService.listarDispositivos()).toEqual([{ id: "a" }]);
    await segurancaService.removerDispositivo("a b");
    expect(api.delete).toHaveBeenCalledWith("/auth/dispositivos/a%20b");
    expect(await segurancaService.removerTodosDispositivos()).toBe(3);
    expect(await segurancaService.listarEventos(10)).toEqual([{ id: "e" }]);
    expect(api.get).toHaveBeenCalledWith("/auth/eventos-de-seguranca", { params: { limite: 10 } });
  });

  it("proteger agora manda a senha e o refresh token só quando existem", async () => {
    api.post.mockResolvedValue({ data: { mensagem: "ok" } });

    await segurancaService.protegerAgora("Senha@123", "refresh");
    await segurancaService.protegerAgora(undefined, null);

    expect(api.post).toHaveBeenNthCalledWith(1, "/auth/conta-comprometida/proteger-agora", { senhaAtual: "Senha@123", refreshToken: "refresh" });
    expect(api.post).toHaveBeenNthCalledWith(2, "/auth/conta-comprometida/proteger-agora", {});
  });

  it("solicitar e confirmar a proteção devolvem a mensagem do servidor", async () => {
    api.post.mockResolvedValue({ data: { mensagem: "Se existe uma conta..." } });

    expect(await segurancaService.solicitarProtecao("a@b.com")).toBe("Se existe uma conta...");
    expect(api.post).toHaveBeenCalledWith("/auth/conta-comprometida/solicitar", { email: "a@b.com" });
    expect(await segurancaService.confirmarProtecao("tok")).toBe("Se existe uma conta...");
    expect(api.post).toHaveBeenCalledWith("/auth/conta-comprometida/confirmar", { token: "tok" });
  });
});

describe("leitura dos erros", () => {
  it("identifica pelo código, nunca pelo texto", () => {
    expect(codigoDoErroSeguranca(erro("DISPOSITIVO_DESAFIO_EXPIRADO"))).toBe("DISPOSITIVO_DESAFIO_EXPIRADO");
    expect(desafioDeDispositivoVenceu(erro("DISPOSITIVO_DESAFIO_EXPIRADO", {}, "qualquer texto"))).toBe(true);
    expect(desafioDeDispositivoVenceu(erro("DISPOSITIVO_CODIGO_INVALIDO"))).toBe(false);
    expect(desafioDeDispositivoVenceu(new Error("x"))).toBe(false);
  });

  it("segundosDeEspera só vale para o erro de espera do reenvio", () => {
    expect(segundosDeEspera(erro("DISPOSITIVO_REENVIO_ESPERA", { segundos: 25 }))).toBe(25);
    expect(segundosDeEspera(erro("DISPOSITIVO_REENVIOS_DEMAIS", { segundos: 25 }))).toBe(0);
    expect(segundosDeEspera(null)).toBe(0);
  });

  it("a mensagem vem do servidor, com um padrão quando não há", () => {
    expect(mensagemDeErroSeguranca(erro("X", {}, "Código incorreto."))).toBe("Código incorreto.");
    expect(mensagemDeErroSeguranca(new Error("x"), "Padrão")).toBe("Padrão");
  });
});
