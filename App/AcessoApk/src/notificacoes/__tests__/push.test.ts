/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockRegistrarPushToken = jest.fn();
const mockRemoverPushToken = jest.fn();
const mockCapturarErro = jest.fn();

jest.mock("../NotificacaoService", () => ({
  NotificacaoService: {
    registrarPushToken: (...args: unknown[]) => mockRegistrarPushToken(...args),
    removerPushToken: (...args: unknown[]) => mockRemoverPushToken(...args),
  },
}));

jest.mock("../../observabilidade", () => ({
  capturarErro: (...args: unknown[]) => mockCapturarErro(...args),
}));

import * as Notifications from "expo-notifications";

import {
  configurarNotificacoesPush,
  ouvirToqueEmNotificacaoPush,
  registrarDispositivoParaPush,
  removerDispositivoDoPush,
} from "../push";

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const getToken = Notifications.getExpoPushTokenAsync as jest.Mock;
const addResponseListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getToken.mockResolvedValue({ data: "ExponentPushToken[abc]" });
});

describe("configurarNotificacoesPush", () => {
  it("registra o handler de notificação em primeiro plano", () => {
    configurarNotificacoesPush();
    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});

describe("registrarDispositivoParaPush", () => {
  it("permissão já concedida: pega o token e registra no backend", async () => {
    getPermissions.mockResolvedValue({ status: "granted", canAskAgain: false });

    await registrarDispositivoParaPush();

    expect(requestPermissions).not.toHaveBeenCalled();
    expect(mockRegistrarPushToken).toHaveBeenCalledWith("ExponentPushToken[abc]", expect.stringMatching(/^(android|ios)$/));
  });

  it("permissão indeterminada: pede, e se concedida registra", async () => {
    getPermissions.mockResolvedValue({ status: "undetermined", canAskAgain: true });
    requestPermissions.mockResolvedValue({ status: "granted", canAskAgain: false });

    await registrarDispositivoParaPush();

    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(mockRegistrarPushToken).toHaveBeenCalled();
  });

  it("permissão negada: não pega token nem registra (não insiste)", async () => {
    getPermissions.mockResolvedValue({ status: "denied", canAskAgain: false });

    await registrarDispositivoParaPush();

    expect(requestPermissions).not.toHaveBeenCalled();
    expect(getToken).not.toHaveBeenCalled();
    expect(mockRegistrarPushToken).not.toHaveBeenCalled();
  });

  it("falha ao pegar o token (sem projectId / emulador): engole o erro, não relança", async () => {
    getPermissions.mockResolvedValue({ status: "granted", canAskAgain: false });
    getToken.mockRejectedValue(new Error("No projectId found"));

    await expect(registrarDispositivoParaPush()).resolves.toBeUndefined();
    expect(mockCapturarErro).toHaveBeenCalled();
    expect(mockRegistrarPushToken).not.toHaveBeenCalled();
  });

  it("falha ao registrar no backend: engole o erro", async () => {
    getPermissions.mockResolvedValue({ status: "granted", canAskAgain: false });
    mockRegistrarPushToken.mockRejectedValue(new Error("rede"));

    await expect(registrarDispositivoParaPush()).resolves.toBeUndefined();
    expect(mockCapturarErro).toHaveBeenCalled();
  });
});

describe("removerDispositivoDoPush", () => {
  it("pega o token do dispositivo e pede a remoção no backend", async () => {
    await removerDispositivoDoPush();
    expect(mockRemoverPushToken).toHaveBeenCalledWith("ExponentPushToken[abc]");
  });

  it("falha ao recuperar o token: engole o erro", async () => {
    getToken.mockRejectedValue(new Error("sem permissão"));

    await expect(removerDispositivoDoPush()).resolves.toBeUndefined();
    expect(mockRemoverPushToken).not.toHaveBeenCalled();
    expect(mockCapturarErro).toHaveBeenCalled();
  });
});

describe("ouvirToqueEmNotificacaoPush", () => {
  it("encaminha o `data` do push ao callback e devolve a função de cancelamento", () => {
    const remove = jest.fn();
    let handlerReal: (r: unknown) => void = () => {};
    addResponseListener.mockImplementation((h: (r: unknown) => void) => {
      handlerReal = h;
      return { remove };
    });

    const aoTocar = jest.fn();
    const cancelar = ouvirToqueEmNotificacaoPush(aoTocar);

    handlerReal({ notification: { request: { content: { data: { entidadeTipo: "vaga", entidadeId: "v1" } } } } });
    expect(aoTocar).toHaveBeenCalledWith({ entidadeTipo: "vaga", entidadeId: "v1" });

    cancelar();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("push sem `data` não quebra — encaminha objeto vazio", () => {
    let handlerReal: (r: unknown) => void = () => {};
    addResponseListener.mockImplementation((h: (r: unknown) => void) => {
      handlerReal = h;
      return { remove: jest.fn() };
    });

    const aoTocar = jest.fn();
    ouvirToqueEmNotificacaoPush(aoTocar);

    handlerReal({ notification: { request: { content: {} } } });
    expect(aoTocar).toHaveBeenCalledWith({});
  });
});
