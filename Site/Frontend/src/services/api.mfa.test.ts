import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

/**
 * O que o cliente HTTP faz quando o servidor nega por causa da verificação em duas etapas, identificando o
 * caso pelo `codigo` (nunca pelo texto):
 * - `MFA_NECESSARIO`: a sessão não passou pelo segundo fator → encerra e manda entrar de novo;
 * - `MFA_NAO_CONFIGURADO`: o administrador precisa configurar → avisa quem escuta (o perfil é relido), sem
 *   derrubar a sessão, para ele conseguir configurar.
 */

const { clienteApi, CHAVE_ACCESS_TOKEN, CHAVE_REFRESH_TOKEN, aoExpirarSessao, aoExigirConfiguracaoMfa } = await import("./api");

function responderCom(status: number, dados: unknown): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError("falhou", String(status), config, null, {
        status,
        statusText: "",
        data: dados,
        headers: {},
        config,
      }),
    );
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

describe("403 MFA_NECESSARIO", () => {
  it("encerra a sessão: limpa os tokens e avisa com a mensagem do servidor", async () => {
    const aoExpirar = vi.fn();
    const parar = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(403, { mensagem: "Confirme a verificação em duas etapas para continuar. Entre novamente.", detalhes: { codigo: "MFA_NECESSARIO" } });

    await expect(clienteApi.get("/admin/usuarios")).rejects.toBeTruthy();

    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBeNull();
    expect(window.localStorage.getItem(CHAVE_REFRESH_TOKEN)).toBeNull();
    expect(aoExpirar).toHaveBeenCalledWith("Confirme a verificação em duas etapas para continuar. Entre novamente.");
    parar();
  });

  it("não tenta renovar o token (a renovação não resolveria)", async () => {
    const adaptador = vi.fn(responderCom(403, { mensagem: "x", detalhes: { codigo: "MFA_NECESSARIO" } }));
    clienteApi.defaults.adapter = adaptador;

    await expect(clienteApi.get("/admin/usuarios")).rejects.toBeTruthy();

    expect(adaptador).toHaveBeenCalledTimes(1);
  });
});

describe("403 MFA_NAO_CONFIGURADO", () => {
  it("avisa quem escuta, mantém a sessão e os tokens (o administrador precisa deles para configurar)", async () => {
    const aoExigir = vi.fn();
    const aoExpirar = vi.fn();
    const pararA = aoExigirConfiguracaoMfa(aoExigir);
    const pararB = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(403, { mensagem: "Administradores precisam ativar", detalhes: { codigo: "MFA_NAO_CONFIGURADO" } });

    await expect(clienteApi.get("/admin/usuarios")).rejects.toBeTruthy();

    expect(aoExigir).toHaveBeenCalledTimes(1);
    expect(aoExpirar).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBe("access");
    pararA();
    pararB();
  });

  it("quem parou de escutar não é mais avisado", async () => {
    const aoExigir = vi.fn();
    aoExigirConfiguracaoMfa(aoExigir)();
    clienteApi.defaults.adapter = responderCom(403, { mensagem: "x", detalhes: { codigo: "MFA_NAO_CONFIGURADO" } });

    await expect(clienteApi.get("/admin/usuarios")).rejects.toBeTruthy();

    expect(aoExigir).not.toHaveBeenCalled();
  });
});

describe("o que não é do TOTP segue como antes", () => {
  it("um 403 comum não encerra a sessão nem avisa", async () => {
    const aoExigir = vi.fn();
    const aoExpirar = vi.fn();
    const pararA = aoExigirConfiguracaoMfa(aoExigir);
    const pararB = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(403, { mensagem: "Você não possui permissão para esta ação." });

    await expect(clienteApi.get("/admin/usuarios")).rejects.toBeTruthy();

    expect(aoExigir).not.toHaveBeenCalled();
    expect(aoExpirar).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(CHAVE_ACCESS_TOKEN)).toBe("access");
    pararA();
    pararB();
  });

  it("nas rotas de login o código do TOTP não mexe na sessão", async () => {
    const aoExpirar = vi.fn();
    const parar = aoExpirarSessao(aoExpirar);
    clienteApi.defaults.adapter = responderCom(403, { mensagem: "x", detalhes: { codigo: "MFA_NECESSARIO" } });

    await expect(clienteApi.post("/auth/login/totp", {})).rejects.toBeTruthy();

    expect(aoExpirar).not.toHaveBeenCalled();
    parar();
  });
});
