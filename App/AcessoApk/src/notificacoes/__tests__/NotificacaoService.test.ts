/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { NotificacaoService } from "../NotificacaoService";

const notificacaoExemplo = {
  id: "n1",
  usuarioId: "u1",
  tipo: "Feed",
  titulo: "Nova curtida na sua publicação",
  descricao: "Ana curtiu sua publicação.",
  lida: false,
  subtipo: "curtida_postagem",
  entidadeTipo: "postagem",
  entidadeId: "p1",
  atorId: "u2",
  ator: { id: "u2", nome: "Ana", fotoPerfil: null },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("NotificacaoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listar", () => {
    it("chama GET /notificacoes com os parâmetros de página e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, notificacoes: [notificacaoExemplo] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await NotificacaoService.listar({ page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith("/notificacoes", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("sem parâmetros, chama GET /notificacoes com params vazio", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, notificacoes: [] },
      });

      await NotificacaoService.listar();

      expect(apiClient.get).toHaveBeenCalledWith("/notificacoes", { params: {} });
    });
  });

  describe("contarNaoLidas", () => {
    it("chama GET /notificacoes/nao-lidas e devolve só o número", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, naoLidas: 3 } });

      const total = await NotificacaoService.contarNaoLidas();

      expect(apiClient.get).toHaveBeenCalledWith("/notificacoes/nao-lidas");
      expect(total).toBe(3);
    });
  });

  describe("marcarComoLida", () => {
    it("chama PATCH /notificacoes/:id/lida e devolve a notificação atualizada", async () => {
      const lida = { ...notificacaoExemplo, lida: true };
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, notificacao: lida } });

      const resultado = await NotificacaoService.marcarComoLida("n1");

      expect(apiClient.patch).toHaveBeenCalledWith("/notificacoes/n1/lida");
      expect(resultado).toEqual(lida);
    });

    it("propaga erro (ex.: notificação de outro usuário → 404)", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (apiClient.patch as jest.Mock).mockRejectedValue(erro);

      await expect(NotificacaoService.marcarComoLida("outro")).rejects.toThrow();
    });
  });

  describe("marcarTodasComoLidas", () => {
    it("chama PATCH /notificacoes/lidas sem corpo", async () => {
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok" } });

      await NotificacaoService.marcarTodasComoLidas();

      expect(apiClient.patch).toHaveBeenCalledWith("/notificacoes/lidas");
    });
  });

  describe("remover", () => {
    it("chama DELETE /notificacoes/:id", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok" } });

      await NotificacaoService.remover("n1");

      expect(apiClient.delete).toHaveBeenCalledWith("/notificacoes/n1");
    });

    it("propaga erro", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (apiClient.delete as jest.Mock).mockRejectedValue(erro);

      await expect(NotificacaoService.remover("outro")).rejects.toThrow();
    });
  });
});
