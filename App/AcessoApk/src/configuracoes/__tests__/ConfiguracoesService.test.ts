/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { ConfiguracoesService } from "../ConfiguracoesService";

describe("ConfiguracoesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("atualizarPrivacidade", () => {
    it("chama PUT /usuarios/privacidade e devolve o novo estado", async () => {
      (apiClient.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, perfilPublico: false } });

      await expect(ConfiguracoesService.atualizarPrivacidade(false)).resolves.toBe(false);
      expect(apiClient.put).toHaveBeenCalledWith("/usuarios/privacidade", { perfilPublico: false });
    });
  });

  describe("atualizarPreferenciaMensagens", () => {
    it("chama PUT /usuarios/privacidade/mensagens e devolve a preferência", async () => {
      (apiClient.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, preferenciaMensagens: "seguidores" } });

      await expect(ConfiguracoesService.atualizarPreferenciaMensagens("seguidores")).resolves.toBe("seguidores");
      expect(apiClient.put).toHaveBeenCalledWith("/usuarios/privacidade/mensagens", { preferenciaMensagens: "seguidores" });
    });
  });

  describe("preferências de notificação", () => {
    const preferencias = {
      id: "p1",
      usuarioId: "u1",
      vagasCandidaturas: true,
      mensagens: true,
      publicacoesComentarios: false,
      redeSeguidores: true,
    };

    it("obterPreferenciasNotificacao: chama GET /notificacoes/preferencias", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, preferencias } });

      await expect(ConfiguracoesService.obterPreferenciasNotificacao()).resolves.toEqual(preferencias);
      expect(apiClient.get).toHaveBeenCalledWith("/notificacoes/preferencias");
    });

    it("atualizarPreferenciasNotificacao: chama PUT /notificacoes/preferencias só com os campos enviados", async () => {
      (apiClient.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, preferencias: { ...preferencias, mensagens: false } } });

      const resposta = await ConfiguracoesService.atualizarPreferenciasNotificacao({ mensagens: false });

      expect(apiClient.put).toHaveBeenCalledWith("/notificacoes/preferencias", { mensagens: false });
      expect(resposta.mensagens).toBe(false);
    });
  });
});
