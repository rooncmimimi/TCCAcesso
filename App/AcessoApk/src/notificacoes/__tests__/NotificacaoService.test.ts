/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { clienteApi } from "../../services/api/cliente";
import { NotificacaoService } from "../NotificacaoService";

const notificacaoExemplo = {
  id: "n1",
  usuarioId: "u1",
  tipo: "feed",
  titulo: "Nova curtida na sua publicação",
  descricao: "Ana curtiu sua publicação.",
  lida: false,
  subtipo: "curtida_postagem",
  entidadeTipo: "postagem",
  entidadeId: "p1",
  atorId: "u2",
  ator: { id: "u2", nome: "Ana", fotoPerfil: null },
  criadoEm: "2026-01-01T00:00:00.000Z",
  atualizadoEm: "2026-01-01T00:00:00.000Z",
};

describe("NotificacaoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listar", () => {
    it("chama GET /notificacoes com os parâmetros de página e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, notificacoes: [notificacaoExemplo] };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await NotificacaoService.listar({ page: 1, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/notificacoes", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("sem parâmetros, chama GET /notificacoes com params vazio", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, notificacoes: [] },
      });

      await NotificacaoService.listar();

      expect(clienteApi.get).toHaveBeenCalledWith("/notificacoes", { params: {} });
    });
  });

  describe("contarNaoLidas", () => {
    it("chama GET /notificacoes/nao-lidas e devolve só o número", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, naoLidas: 3 } });

      const total = await NotificacaoService.contarNaoLidas();

      expect(clienteApi.get).toHaveBeenCalledWith("/notificacoes/nao-lidas");
      expect(total).toBe(3);
    });
  });

  describe("marcarComoLida", () => {
    it("chama PATCH /notificacoes/:id/lida e devolve a notificação atualizada", async () => {
      const lida = { ...notificacaoExemplo, lida: true };
      (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, notificacao: lida } });

      const resultado = await NotificacaoService.marcarComoLida("n1");

      expect(clienteApi.patch).toHaveBeenCalledWith("/notificacoes/n1/lida");
      expect(resultado).toEqual(lida);
    });

    it("propaga erro (ex.: notificação de outro usuário → 404)", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (clienteApi.patch as jest.Mock).mockRejectedValue(erro);

      await expect(NotificacaoService.marcarComoLida("outro")).rejects.toThrow();
    });
  });

  describe("marcarTodasComoLidas", () => {
    it("chama PATCH /notificacoes/lidas sem corpo", async () => {
      (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok" } });

      await NotificacaoService.marcarTodasComoLidas();

      expect(clienteApi.patch).toHaveBeenCalledWith("/notificacoes/lidas");
    });
  });

  describe("remover", () => {
    it("chama DELETE /notificacoes/:id", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok" } });

      await NotificacaoService.remover("n1");

      expect(clienteApi.delete).toHaveBeenCalledWith("/notificacoes/n1");
    });

    it("propaga erro", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (clienteApi.delete as jest.Mock).mockRejectedValue(erro);

      await expect(NotificacaoService.remover("outro")).rejects.toThrow();
    });
  });

  describe("registrarPushToken", () => {
    it("faz POST /notificacoes/push-token com token e plataforma", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, registrado: true } });

      await NotificacaoService.registrarPushToken("ExponentPushToken[abc]", "android");

      expect(clienteApi.post).toHaveBeenCalledWith("/notificacoes/push-token", {
        token: "ExponentPushToken[abc]",
        plataforma: "android",
      });
    });

    it("propaga erro", async () => {
      (clienteApi.post as jest.Mock).mockRejectedValue(new Error("500"));
      await expect(NotificacaoService.registrarPushToken("t", "ios")).rejects.toThrow();
    });
  });

  describe("removerPushToken", () => {
    it("faz DELETE /notificacoes/push-token com o token no corpo", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, removido: true } });

      await NotificacaoService.removerPushToken("ExponentPushToken[abc]");

      expect(clienteApi.delete).toHaveBeenCalledWith("/notificacoes/push-token", {
        data: { token: "ExponentPushToken[abc]" },
      });
    });
  });
});
