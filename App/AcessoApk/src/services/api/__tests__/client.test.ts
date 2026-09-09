/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports
   dos módulos que ele substitui (o Jest "hoisted" a chamada para o topo do
   arquivo de qualquer forma); é o padrão usual do Jest, não uma desorganização. */

// Tudo o que a instância axios falsa precisa (interceptors capturados, a
// função "post" crua) é criado DENTRO do factory do `jest.mock`, não fora
// dele. Só o `jest.mock` em si é hoisted para o topo do arquivo pelo
// Jest — variáveis `const` declaradas fora dele NÃO são, então uma
// variável externa referenciada aqui poderia ainda estar indefinida no
// momento em que `client.ts` importa e chama `axios.create(...)` (a própria
// importação de `client.ts` também é hoisted, na frente de qualquer `const`
// do arquivo). Colocar tudo dentro do factory evita esse problema de ordem
// por completo.
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
    // capturados e a chamada crua de refresh — não faz parte do módulo real.
    __mock: { mockRequestInterceptors, mockResponseInterceptors, mockRequest, mockAxiosPost, mockAxiosInstance },
  };
});

jest.mock("../../../storage/secureStorage", () => ({
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

import * as axiosMockModule from "axios";
import { clearTokens, saveTokens } from "../../../storage/secureStorage";
// Importado DEPOIS dos mocks acima — é o que faz `axios.create(...)` (chamado
// no topo de `client.ts`) usar a instância falsa em vez de um axios real.
import { apiClient, clearSession, getAccessToken, registerSessionEndedListener, setSession } from "../client";

const { mockRequestInterceptors, mockResponseInterceptors, mockRequest, mockAxiosPost, mockAxiosInstance } = (
  axiosMockModule as unknown as { __mock: Record<string, any> }
).__mock;

function criarConfig(url: string, extra: Record<string, unknown> = {}) {
  return { url, headers: { set: jest.fn() }, _retry: undefined as boolean | undefined, ...extra };
}

function criarErro401(config: ReturnType<typeof criarConfig>) {
  return { response: { status: 401, data: {} }, config };
}

describe("apiClient", () => {
  beforeEach(() => {
    mockRequest.mockClear();
    mockAxiosPost.mockReset();
    (saveTokens as jest.Mock).mockClear();
    (clearTokens as jest.Mock).mockClear();
    clearSession();
    registerSessionEndedListener(null);
  });

  it("apiClient existe e é a mesma instância que os interceptors foram registrados nela", () => {
    expect(apiClient).toBe(mockAxiosInstance);
    expect(mockRequestInterceptors.length).toBeGreaterThan(0);
    expect(mockResponseInterceptors.length).toBeGreaterThan(0);
  });

  it("inclui 'Authorization: Bearer <token>' quando há sessão", () => {
    setSession({ accessToken: "tok-abc", refreshToken: "ref-abc" });
    const config = criarConfig("/auth/me");

    mockRequestInterceptors[0](config);

    expect(config.headers.set).toHaveBeenCalledWith("Authorization", "Bearer tok-abc");
  });

  it("não inclui Authorization em rotas públicas de autenticação", () => {
    setSession({ accessToken: "tok-abc", refreshToken: "ref-abc" });
    const config = criarConfig("/auth/login");

    mockRequestInterceptors[0](config);

    expect(config.headers.set).not.toHaveBeenCalled();
  });

  it("em 401 de rota protegida, renova a sessão e repete a requisição original uma única vez", async () => {
    setSession({ accessToken: "expirado", refreshToken: "ref-valido" });
    mockAxiosPost.mockResolvedValueOnce({ data: { token: "novo-token", refreshToken: "novo-refresh" } });

    const original = criarConfig("/auth/me");
    const resultado = await mockResponseInterceptors[0].onRejected(criarErro401(original));

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(mockAxiosPost.mock.calls[0][0]).toContain("/auth/refresh");
    expect(mockAxiosPost.mock.calls[0][1]).toEqual({ refreshToken: "ref-valido" });
    expect(saveTokens).toHaveBeenCalledWith("novo-token", "novo-refresh");
    expect(getAccessToken()).toBe("novo-token");
    expect(original._retry).toBe(true);
    expect(original.headers.set).toHaveBeenCalledWith("Authorization", "Bearer novo-token");
    expect(mockRequest).toHaveBeenCalledWith(original);
    expect(resultado).toEqual({ data: { ok: true }, config: original });
  });

  it("se a renovação falhar, limpa a sessão, avisa o listener e NÃO repete a requisição", async () => {
    setSession({ accessToken: "expirado", refreshToken: "ref-invalido" });
    mockAxiosPost.mockRejectedValueOnce(new Error("refresh token inválido"));
    const listener = jest.fn();
    registerSessionEndedListener(listener);

    const original = criarConfig("/auth/me");
    const erro = criarErro401(original);

    await expect(mockResponseInterceptors[0].onRejected(erro)).rejects.toBe(erro);

    expect(listener).toHaveBeenCalledWith("expired");
    expect(clearTokens).toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("não tenta renovar de novo numa requisição que já foi repetida (evita loop infinito)", async () => {
    setSession({ accessToken: "tok", refreshToken: "ref" });
    const original = criarConfig("/auth/me", { _retry: true });
    const erro = criarErro401(original);

    await expect(mockResponseInterceptors[0].onRejected(erro)).rejects.toBe(erro);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("um 401 em '/auth/login' nunca dispara o fluxo de renovação (é credencial errada, não sessão expirada)", async () => {
    setSession({ accessToken: null as unknown as string, refreshToken: "ref" });
    const original = criarConfig("/auth/login");
    const erro = criarErro401(original);

    await expect(mockResponseInterceptors[0].onRejected(erro)).rejects.toBe(erro);

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("3 requisições com 401 ao mesmo tempo disparam só 1 chamada de refresh (sem duplicar renovação)", async () => {
    setSession({ accessToken: "expirado", refreshToken: "ref-valido" });
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
    setSession({ accessToken: "tok", refreshToken: "ref" });
    const listener = jest.fn();
    registerSessionEndedListener(listener);

    const original = criarConfig("/auth/me");
    const erro403 = {
      response: { status: 403, data: { mensagem: "bloqueada", detalhes: { codigo: "CONTA_BLOQUEADA" } } },
      config: original,
    };

    await expect(mockResponseInterceptors[0].onRejected(erro403)).rejects.toBe(erro403);

    expect(listener).toHaveBeenCalledWith("blocked");
    expect(clearTokens).toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });
});
