import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

/**
 * Sessão encerrada em outro dispositivo (ou pelo logout): o servidor responde 401 `SESSAO_ENCERRADA`. Renovar o token não
 * adianta (o refresh token foi revogado junto), então o cliente encerra direto e mostra a mensagem do servidor, em vez
 * de tentar renovar e cair num encerramento mudo.
 */

const { clienteApi, CHAVE_ACCESS_TOKEN, CHAVE_REFRESH_TOKEN, aoExpirarSessao } = await import("./api");

function responderCom(status: number, dados: unknown): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(new AxiosError("falhou", String(status), config, null, { status, statusText: "", data: dados, headers: {}, config }));
}

const original = clienteApi.defaults.adapter;

beforeEach(() => {
  window.localStorage.setItem(CHAVE_ACCESS_TOKEN, "access");
  window.localStorage.setItem(CHAVE_REFRESH_TOKEN, "refresh");
});

afterEach(() => {
  clienteApi.defaults.adapter = original;
  window.localStorage.clear();
});

describe("401 SESSAO_ENCERRADA", () => {
  it("encerra a sessão local e mostra a mensagem do servidor", async () => {
    const aoExpirar = vi.fn();
    const parar = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(401, { mensagem: "Esta sessão foi encerrada. Entre novamente.", detalhes: { codigo: "SESSAO_ENCERRADA" } });

    await expect(clienteApi.get("/feed")).rejects.toBeTruthy();

    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBeNull();
    expect(window.localStorage.getItem(CHAVE_REFRESH_TOKEN)).toBeNull();
    expect(aoExpirar).toHaveBeenCalledWith("Esta sessão foi encerrada. Entre novamente.");
    parar();
  });

  it("NÃO tenta renovar o token (uma só chamada à API)", async () => {
    const adaptador = vi.fn(responderCom(401, { mensagem: "x", detalhes: { codigo: "SESSAO_ENCERRADA" } }));
    clienteApi.defaults.adapter = adaptador;

    await expect(clienteApi.get("/feed")).rejects.toBeTruthy();

    expect(adaptador).toHaveBeenCalledTimes(1);
  });

  it("um 401 comum (token vencido) continua tentando renovar", async () => {
    window.localStorage.removeItem(CHAVE_REFRESH_TOKEN);
    const aoExpirar = vi.fn();
    const parar = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(401, { mensagem: "Token inválido ou expirado." });

    await expect(clienteApi.get("/feed")).rejects.toBeTruthy();

    // Sem refresh token a renovação falha e o encerramento acontece pelo caminho de sempre, sem mensagem própria.
    expect(aoExpirar).toHaveBeenCalledWith(undefined);
    parar();
  });

  it("nas rotas de login, o código não mexe na sessão", async () => {
    const aoExpirar = vi.fn();
    const parar = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(401, { mensagem: "x", detalhes: { codigo: "SESSAO_ENCERRADA" } });

    await expect(clienteApi.post("/auth/login", {})).rejects.toBeTruthy();

    expect(aoExpirar).not.toHaveBeenCalled();
    parar();
  });
});
