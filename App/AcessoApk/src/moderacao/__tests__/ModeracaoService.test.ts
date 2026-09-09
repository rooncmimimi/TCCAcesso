/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { ModeracaoService } from "../ModeracaoService";

const usuarioBloqueadoExemplo = { id: "u2", nome: "Beatriz Souza", fotoPerfil: null, tipoUsuario: "candidato" };

describe("ModeracaoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listarBloqueados", () => {
    it("chama GET /usuarios/bloqueados com os parâmetros e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 20, totalPaginas: 1, bloqueados: [usuarioBloqueadoExemplo] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await ModeracaoService.listarBloqueados({ page: 1, limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith("/usuarios/bloqueados", { params: { page: 1, limit: 20 } });
      expect(resposta).toEqual(envelope);
    });
  });

  describe("bloquear", () => {
    it("chama POST /usuarios/:id/bloquear e devolve o boolean do servidor", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, bloqueado: true } });

      await expect(ModeracaoService.bloquear("u2")).resolves.toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith("/usuarios/u2/bloquear");
    });

    it("propaga erro (ex.: tentando bloquear a si mesmo → 400)", async () => {
      const erro = Object.assign(new Error("400"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(ModeracaoService.bloquear("u1")).rejects.toBe(erro);
    });
  });

  describe("desbloquear", () => {
    it("chama DELETE /usuarios/:id/bloquear e devolve false", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, bloqueado: false } });

      await expect(ModeracaoService.desbloquear("u2")).resolves.toBe(false);
      expect(apiClient.delete).toHaveBeenCalledWith("/usuarios/u2/bloquear");
    });
  });

  describe("denunciar", () => {
    it("chama POST /denuncias com os dados e devolve só a denúncia", async () => {
      const denuncia = { id: "d1", entidadeTipo: "postagem", entidadeId: "p1", motivo: "spam", status: "pendente" };
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, denuncia } });

      const dados = { entidadeTipo: "postagem" as const, entidadeId: "p1", motivo: "spam" as const };
      const resultado = await ModeracaoService.denunciar(dados);

      expect(apiClient.post).toHaveBeenCalledWith("/denuncias", dados);
      expect(resultado).toEqual(denuncia);
    });

    it("propaga erro (ex.: denúncia duplicada ainda em análise → 409)", async () => {
      const erro = Object.assign(new Error("409"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(
        ModeracaoService.denunciar({ entidadeTipo: "usuario", entidadeId: "u2", motivo: "assedio" }),
      ).rejects.toBe(erro);
    });
  });
});
