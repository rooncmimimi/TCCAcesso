import { describe, it, expect, afterEach } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

/**
 * O token do aparelho de confiança vai em TODA requisição (cabeçalho `X-Dispositivo`) e sobrevive a sair da conta: é do aparelho,
 * não da sessão. O servidor é simulado por um adaptador que devolve os cabeçalhos recebidos.
 */

const { clienteApi, CHAVE_DISPOSITIVO_CONFIAVEL, guardarDispositivoConfiavel, lerDispositivoConfiavel, esquecerDispositivoConfiavel, definirTokens, limparTokens } =
  await import("./api");

function espelho(): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.resolve({ status: 200, statusText: "OK", data: {}, headers: {}, config, request: {} });
}

const original = clienteApi.defaults.adapter;

afterEach(() => {
  clienteApi.defaults.adapter = original;
  window.localStorage.clear();
});

async function cabecalhosEnviados() {
  clienteApi.defaults.adapter = espelho();
  const resposta = await clienteApi.get("/qualquer");

  return resposta.config.headers;
}

describe("X-Dispositivo", () => {
  it("sem aparelho de confiança guardado, o cabeçalho não vai", async () => {
    expect((await cabecalhosEnviados()).has("X-Dispositivo")).toBe(false);
  });

  it("com o token guardado, vai em toda requisição, junto do login", async () => {
    guardarDispositivoConfiavel("token-do-aparelho");

    const cabecalhos = await cabecalhosEnviados();

    expect(cabecalhos.get("X-Dispositivo")).toBe("token-do-aparelho");
    expect(window.localStorage.getItem(CHAVE_DISPOSITIVO_CONFIAVEL)).toBe("token-do-aparelho");
  });

  it("sair da conta (limpar os tokens da sessão) NÃO esquece o aparelho", () => {
    guardarDispositivoConfiavel("token-do-aparelho");
    definirTokens("a", "r");

    limparTokens();

    expect(lerDispositivoConfiavel()).toBe("token-do-aparelho");
  });

  it("esquecer apaga só o aparelho", () => {
    guardarDispositivoConfiavel("token-do-aparelho");
    definirTokens("a", "r");

    esquecerDispositivoConfiavel();

    expect(lerDispositivoConfiavel()).toBeNull();
    expect(window.localStorage.getItem("acesso:accessToken")).toBe("a");
  });
});
