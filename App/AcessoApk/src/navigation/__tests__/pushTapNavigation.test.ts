/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
const mockNavigate = jest.fn();
const mockIsReady = jest.fn(() => true);
let handlerDeToque: (dados: unknown) => void = () => {};

jest.mock("../RootNavigator", () => ({
  navigationRef: {
    isReady: () => mockIsReady(),
    navigate: (...args: unknown[]) => mockNavigate(...args),
  },
}));

jest.mock("../../notificacoes", () => ({
  ouvirToqueEmNotificacaoPush: (cb: (dados: unknown) => void) => {
    handlerDeToque = cb;
    return jest.fn();
  },
}));

import { ligarNavegacaoPorToqueEmPush } from "../pushTapNavigation";

beforeEach(() => {
  jest.clearAllMocks();
  mockIsReady.mockReturnValue(true);
  ligarNavegacaoPorToqueEmPush();
});

describe("ligarNavegacaoPorToqueEmPush", () => {
  it("entidadeTipo 'usuario' → App/PublicProfile", () => {
    handlerDeToque({ entidadeTipo: "usuario", entidadeId: "u1" });
    expect(mockNavigate).toHaveBeenCalledWith("App", { screen: "PublicProfile", params: { usuarioId: "u1" } });
  });

  it("entidadeTipo 'postagem' → App/PostagemDetail", () => {
    handlerDeToque({ entidadeTipo: "postagem", entidadeId: "p1" });
    expect(mockNavigate).toHaveBeenCalledWith("App", { screen: "PostagemDetail", params: { postagemId: "p1" } });
  });

  it("entidadeTipo 'vaga' → App/VagaDetail", () => {
    handlerDeToque({ entidadeTipo: "vaga", entidadeId: "v1" });
    expect(mockNavigate).toHaveBeenCalledWith("App", { screen: "VagaDetail", params: { vagaId: "v1" } });
  });

  it("entidadeTipo sem tela direta (conversa) → lista de notificações", () => {
    handlerDeToque({ entidadeTipo: "conversa", entidadeId: "c1" });
    expect(mockNavigate).toHaveBeenCalledWith("App", { screen: "Tabs", params: { screen: "Notifications" } });
  });

  it("entidadeId ausente → lista de notificações (não navega para uma tela sem id)", () => {
    handlerDeToque({ entidadeTipo: "postagem" });
    expect(mockNavigate).toHaveBeenCalledWith("App", { screen: "Tabs", params: { screen: "Notifications" } });
  });

  it("navigationRef ainda não pronto: não navega", () => {
    mockIsReady.mockReturnValue(false);
    handlerDeToque({ entidadeTipo: "vaga", entidadeId: "v1" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
