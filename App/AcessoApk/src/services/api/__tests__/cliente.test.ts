/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports
   dos módulos que ele substitui (o Jest "hoisted" a chamada para o topo do
   arquivo de qualquer forma); é o padrão usual do Jest, não uma desorganização. */

// Tudo o que a instância falsa do axios precisa é criado dentro da factory do `jest.mock`. Só o
// `jest.mock` sobe para o topo do arquivo; um `const` declarado fora dela ainda estaria indefinido
// quando `cliente.ts` chama `axios.create(...)` ao ser importado.
jest.mock("axios", () => {
  const mockRequestInterceptors: ((config: any) => any)[] = [];
  const mockResponseInterceptors: { onFulfilled: (r: any) => any; onRejected: (e: any) => any }[] = [];
  const mockRequest = jest.fn(async (config: any) => ({ data: { ok: true }, config }));
  const mockAxiosInstance = Object.assign(mockRequest, {
    interceptors: {
      request: { use: (fn: any) => mockRequestInterceptors.push(fn) },
      response: {
        use: (onFulfilled: any, onRejected: any) => mockResponseInterceptors.push({ onFulfilled, onRejected }),
      },
    },
  });
  const mockAxiosPost = jest.fn();

  return {
    __esModule: true,
    create: jest.fn(() => mockAxiosInstance),
    default: { post: (...args: unknown[]) => mockAxiosPost(...args) },
    // Só para este teste conseguir inspecionar/acionar os interceptors
    // capturados e a chamada crua de refresh: não faz parte do módulo real.
    __mock: { mockRequestInterceptors, mockResponseInterceptors, mockRequest, mockAxiosPost, mockAxiosInstance },
  };
});

jest.mock("../../../armazenamento/armazenamentoSeguro", () => ({
  salvarTokens: jest.fn(),
  limparTokens: jest.fn(),
}));

import * as axiosMockModule from "axios";
import { limparTokens, salvarTokens } from "../../../armazenamento/armazenamentoSeguro";
// Importado depois dos mocks, para que o `axios.create(...)` do topo de `cliente.ts` use a
// instância falsa.
import { clienteApi, limparSessao, obterAccessToken, registrarOuvinteFimSessao, definirSessao } from "../cliente";

const { mockRequestInterceptors, mockResponseInterceptors, mockRequest, mockAxiosPost, mockAxiosInstance } = (
  axiosMockModule as unknown as { __mock: Record<string, any> }
).__mock;

function criarConfig(url: string, extra: Record<string, unknown> = {}) {
  return { url, headers: { set: jest.fn() }, _retry: undefined as boolean | undefined, ...extra };
}

function criarErro401(config: ReturnType<typeof criarConfig>) {
  return { response: { status: 401, data: {} }, config };
}

describe("clienteApi", () => {
  beforeEach(() => {
    mockRequest.mockClear();
    mockAxiosPost.mockReset();
    (salvarTokens as jest.Mock).mockClear();
    (limparTokens as jest.Mock).mockClear();
    limparSessao();
    registrarOuvinteFimSessao(null);
  });

  it("clienteApi existe e é a mesma instância que os interceptors foram registrados nela", () => {
    expect(clienteApi).toBe(mockAxiosInstance);
    expect(mockRequestInterceptors.length).toBeGreaterThan(0);
    expect(mockResponseInterceptors.length).toBeGreaterThan(0);
  });

  it("inclui 'Authorization: Bearer <token>' quando há sessão", () => {
    definirSessao({ accessToken: "tok-abc", refreshToken: "ref-abc" });
    const config = criarConfig("/auth/me");

    mockRequestInterceptors[0](config);

    expect(config.headers.set).toHaveBeenCalledWith("Authorization", "Bearer tok-abc");
  });

  it("não inclui Authorization em rotas públicas de autenticação", () => {
    definirSessao({ accessToken: "tok-abc", refreshToken: "ref-abc" });
    const config = criarConfig("/auth/login");

    mockRequestInterceptors[0](config);

    expect(config.headers.set).not.toHaveBeenCalled();
  });

  it("em 401 de rota protegida, renova a sessão e repete a requisição original uma única vez", async () => {
    definirSessao({ accessToken: "expirado", refreshToken: "ref-valido" });
    mockAxiosPost.mockResolvedValueOnce({ data: { token: "novo-token", refreshToken: "novo-refresh" } });

    const original = criarConfig("/auth/me");
    const resultado = await mockResponseInterceptors[0].onRejected(criarErro401(original));

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][0]).toContain("/auth/refresh");
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({ refreshToken: "ref-valido" });
    expect(salvarTokens).toHaveBeenCalledWith("novo-token", "novo-refresh");
    expect(obterAccessToken()).toBe("novo-token");
    expect(original._retry).toBe(true);
    expect(original.headers.set).toHaveBeenCalledWith("Authorization", "Bearer novo-token");
    expect(mockRequest).toHaveBeenCalledWith(original);
    expect(resultado).toEqual({ data: { ok: true }, config: original });
  });

  it("se a renovação falhar, limpa a sessão, avisa o listener e NÃO repete a requisição", async () => {
    definirSessao({ accessToken: "expirado", refreshToken: "ref-invalido" });
    mockAxiosPost.mockRejectedValueOnce(new Error("refresh token inválido"));
    const listener = jest.fn();
    registrarOuvinteFimSessao(listener);

    const original = criarConfig("/auth/me");
    const erro = criarErro401(original);

    await expect(mockResponseInterceptors[0].onRejected(erro)).rejects.toBe(erro);

    expect(listener).toHaveBeenCalledWith("expirada");
    expect(limparTokens).toHaveBeenCalled();
    expect(obterAccessToken()).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("não tenta renovar de novo numa requisição que já foi repetida (evita loop infinito)", async () => {
    definirSessao({ accessToken: "tok", refreshToken: "ref" });
    const original = criarConfig("/auth/me", { _retry: true });
    const erro = criarErro401(original);

    await expect(mockResponseInterceptors[0].onRejected(erro)).rejects.toBe(erro);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("um 401 em '/auth/login' nunca dispara o fluxo de renovação (é credencial errada, não sessão expirada)", async () => {
    definirSessao({ accessToken: null as unknown as string, refreshToken: "ref" });
    const original = criarConfig("/auth/login");
    const erro = criarErro401(original);

    await expect(mockResponseInterceptors[0].onRejected(erro)).rejects.toBe(erro);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("3 requisições com 401 ao mesmo tempo disparam só 1 chamada de refresh (sem duplicar renovação)", async () => {
    definirSessao({ accessToken: "expirado", refreshToken: "ref-valido" });
    let resolverRefresh: (valor: unknown) => void = () => {};
    mockAxiosPost.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverRefresh = resolve;
      }),
    );

    const configA = criarConfig("/auth/me");
    const configB = criarConfig("/perfil");
    const configC = criarConfig("/vagas");

    const promessaA = mockResponseInterceptors[0].onRejected(criarErro401(configA));
    const promessaB = mockResponseInterceptors[0].onRejected(criarErro401(configB));
    const promessaC = mockResponseInterceptors[0].onRejected(criarErro401(configC));

    resolverRefresh({ data: { token: "novo-token", refreshToken: "novo-refresh" } });
    await Promise.all([promessaA, promessaB, promessaC]);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockRequest).toHaveBeenCalledTimes(3);
  });

  it("em 403 com detalhes.codigo=CONTA_BLOQUEADA, encerra a sessão sem tentar renovar", async () => {
    definirSessao({ accessToken: "tok", refreshToken: "ref" });
    const listener = jest.fn();
    registrarOuvinteFimSessao(listener);

    const original = criarConfig("/auth/me");
    const erro403 = {
      response: { status: 403, data: { mensagem: "bloqueada", detalhes: { codigo: "CONTA_BLOQUEADA" } } },
      config: original,
    };

    await expect(mockResponseInterceptors[0].onRejected(erro403)).rejects.toBe(erro403);

    expect(listener).toHaveBeenCalledWith("bloqueada");
    expect(limparTokens).toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  // Renovar seria inútil: a troca de senha revoga os refresh tokens junto com os de acesso.
  it("em 401 com detalhes.codigo=SENHA_ALTERADA, encerra a sessão sem tentar renovar", async () => {
    definirSessao({ accessToken: "tok", refreshToken: "ref" });
    const listener = jest.fn();
    registrarOuvinteFimSessao(listener);

    const erro401 = {
      response: { status: 401, data: { mensagem: "senha alterada", detalhes: { codigo: "SENHA_ALTERADA" } } },
      config: criarConfig("/auth/me"),
    };

    await expect(mockResponseInterceptors[0].onRejected(erro401)).rejects.toBe(erro401);

    expect(listener).toHaveBeenCalledWith("senha_alterada");
    expect(limparTokens).toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });
});
