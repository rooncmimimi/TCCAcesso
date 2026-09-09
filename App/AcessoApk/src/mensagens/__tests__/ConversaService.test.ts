/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { ConversaService } from "../ConversaService";

const participante = (sobrescreve: Partial<Record<string, unknown>> = {}) => ({
  id: "u2",
  nome: "Beatriz Souza",
  fotoPerfil: null,
  tipoUsuario: "candidato",
  ...sobrescreve,
});

const conversaExemplo = {
  id: "c1",
  usuarioAId: "u1",
  usuarioBId: "u2",
  usuarioA: participante({ id: "u1", nome: "Ana" }),
  usuarioB: participante(),
  ultimaMensagem: "2026-01-01T10:00:00.000Z",
  mensagensNaoLidas: 2,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T10:00:00.000Z",
};

const mensagemExemplo = {
  id: "m1",
  conversaId: "c1",
  remetenteId: "u1",
  conteudo: "Olá!",
  lida: false,
  lidaEm: null,
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-01-01T10:00:00.000Z",
  remetente: { id: "u1", nome: "Ana", fotoPerfil: null },
};

describe("ConversaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listar", () => {
    it("chama GET /conversas com os parâmetros de página e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 15, totalPaginas: 1, conversas: [conversaExemplo] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await ConversaService.listar({ page: 1, limit: 15 });

      expect(apiClient.get).toHaveBeenCalledWith("/conversas", { params: { page: 1, limit: 15 } });
      expect(resposta).toEqual(envelope);
    });
  });

  describe("abrir", () => {
    it("chama POST /conversas com usuarioId e devolve só a conversa", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, conversa: conversaExemplo } });

      const resultado = await ConversaService.abrir({ usuarioId: "u2" });

      expect(apiClient.post).toHaveBeenCalledWith("/conversas", { usuarioId: "u2" });
      expect(resultado).toEqual(conversaExemplo);
    });

    it("propaga erro (ex.: preferência de mensagens não permite → 403)", async () => {
      const erro = Object.assign(new Error("403"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(ConversaService.abrir({ usuarioId: "u2" })).rejects.toThrow();
    });
  });

  describe("obterPorId", () => {
    it("chama GET /conversas/:id e devolve só a conversa", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, conversa: conversaExemplo } });

      const resultado = await ConversaService.obterPorId("c1");

      expect(apiClient.get).toHaveBeenCalledWith("/conversas/c1");
      expect(resultado).toEqual(conversaExemplo);
    });
  });

  describe("contarNaoLidas", () => {
    it("chama GET /conversas/nao-lidas e devolve só o número", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, naoLidas: 4 } });

      const total = await ConversaService.contarNaoLidas();

      expect(apiClient.get).toHaveBeenCalledWith("/conversas/nao-lidas");
      expect(total).toBe(4);
    });
  });

  describe("podeIniciar", () => {
    it("chama GET /conversas/pode-iniciar/:usuarioId e devolve permitido+motivo", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, permitido: false, motivo: "Não é possível." } });

      const resultado = await ConversaService.podeIniciar("u2");

      expect(apiClient.get).toHaveBeenCalledWith("/conversas/pode-iniciar/u2");
      expect(resultado).toEqual({ permitido: false, motivo: "Não é possível." });
    });
  });

  describe("listarMensagens", () => {
    it("chama GET /conversas/:id/mensagens com parâmetros e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 100, totalPaginas: 1, mensagens: [mensagemExemplo] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await ConversaService.listarMensagens("c1", { page: 1, limit: 100 });

      expect(apiClient.get).toHaveBeenCalledWith("/conversas/c1/mensagens", { params: { page: 1, limit: 100 } });
      expect(resposta).toEqual(envelope);
    });
  });

  describe("enviarMensagem", () => {
    it("chama POST /conversas/:id/mensagens com conteudo e devolve só a mensagem", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: mensagemExemplo } });

      const resultado = await ConversaService.enviarMensagem("c1", "Olá!");

      expect(apiClient.post).toHaveBeenCalledWith("/conversas/c1/mensagens", { conteudo: "Olá!" });
      expect(resultado).toEqual(mensagemExemplo);
    });

    it("propaga erro (ex.: conversa somente-leitura → 403)", async () => {
      const erro = Object.assign(new Error("403"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(ConversaService.enviarMensagem("c1", "Olá!")).rejects.toThrow();
    });
  });

  describe("marcarComoLidas", () => {
    it("chama PATCH /conversas/:id/mensagens/lidas sem corpo", async () => {
      (apiClient.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok" } });

      await ConversaService.marcarComoLidas("c1");

      expect(apiClient.patch).toHaveBeenCalledWith("/conversas/c1/mensagens/lidas");
    });
  });
});
