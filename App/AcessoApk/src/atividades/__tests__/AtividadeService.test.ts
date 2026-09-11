/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { AtividadeService } from "../AtividadeService";
import type { MinhaAtividade } from "../types";

const atividadeVazia: MinhaAtividade = {
  ehCandidato: true,
  candidaturas: { itens: [], total: 0 },
  vagasFavoritas: { itens: [], total: 0 },
  seguindo: { pessoas: { itens: [], total: 0 }, empresas: { itens: [], total: 0 } },
  interacoesFeed: {
    curtidas: { itens: [], total: 0 },
    comentarios: { itens: [], total: 0 },
    compartilhamentos: { itens: [], total: 0 },
  },
};

describe("AtividadeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("minha", () => {
    it("chama GET /atividades/minha sem parâmetros e devolve só o objeto `atividade`", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, atividade: atividadeVazia } });

      const resposta = await AtividadeService.minha();

      expect(apiClient.get).toHaveBeenCalledWith("/atividades/minha");
      expect(resposta).toEqual(atividadeVazia);
    });

    it("propaga erro de rede/servidor sem tratar (mesma regra de VagasService/SeguidorService)", async () => {
      const erro = new Error("Network Error");
      (apiClient.get as jest.Mock).mockRejectedValue(erro);

      await expect(AtividadeService.minha()).rejects.toThrow("Network Error");
    });
  });
});
