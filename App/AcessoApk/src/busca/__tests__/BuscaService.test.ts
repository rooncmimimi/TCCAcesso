/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { clienteApi } from "../../services/api/cliente";
import { BuscaService } from "../BuscaService";

describe("BuscaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("buscarResumo", () => {
    it("chama GET /busca com tipo=tudo e devolve o envelope intacto", async () => {
      const resumo = {
        sucesso: true,
        termo: "dev",
        tipo: "tudo",
        pagina: 1,
        limite: 5,
        total: 4,
        totais: { usuarios: 1, empresas: 1, vagas: 1, postagens: 1 },
        resultados: { usuarios: [], empresas: [], vagas: [], postagens: [] },
      };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: resumo });

      const resposta = await BuscaService.buscarResumo("dev");

      expect(clienteApi.get).toHaveBeenCalledWith("/busca", { params: { q: "dev", tipo: "tudo" } });
      expect(resposta).toEqual(resumo);
    });
  });

  describe("buscarUsuarios", () => {
    it("chama GET /busca com tipo=usuarios e os parâmetros de página", async () => {
      const envelope = { sucesso: true, termo: "ana", tipo: "usuarios", pagina: 2, limite: 10, total: 15, totalPaginas: 2, resultados: { usuarios: [] } };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await BuscaService.buscarUsuarios("ana", { page: 2, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/busca", { params: { q: "ana", tipo: "usuarios", page: 2, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("sem parâmetros de página, manda só q e tipo", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, termo: "ana", tipo: "usuarios", pagina: 1, limite: 10, total: 0, totalPaginas: 0, resultados: { usuarios: [] } },
      });

      await BuscaService.buscarUsuarios("ana");

      expect(clienteApi.get).toHaveBeenCalledWith("/busca", { params: { q: "ana", tipo: "usuarios" } });
    });
  });

  describe("buscarEmpresas", () => {
    it("chama GET /busca com tipo=empresas", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, termo: "acme", tipo: "empresas", pagina: 1, limite: 10, total: 0, totalPaginas: 0, resultados: { empresas: [] } },
      });

      await BuscaService.buscarEmpresas("acme", { page: 1, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/busca", { params: { q: "acme", tipo: "empresas", page: 1, limit: 10 } });
    });
  });

  describe("buscarVagas", () => {
    it("chama GET /busca com tipo=vagas", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, termo: "dev", tipo: "vagas", pagina: 1, limite: 10, total: 0, totalPaginas: 0, resultados: { vagas: [] } },
      });

      await BuscaService.buscarVagas("dev");

      expect(clienteApi.get).toHaveBeenCalledWith("/busca", { params: { q: "dev", tipo: "vagas" } });
    });
  });

  describe("buscarPostagens", () => {
    it("chama GET /busca com tipo=postagens", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, termo: "oi", tipo: "postagens", pagina: 1, limite: 10, total: 0, totalPaginas: 0, resultados: { postagens: [] } },
      });

      await BuscaService.buscarPostagens("oi");

      expect(clienteApi.get).toHaveBeenCalledWith("/busca", { params: { q: "oi", tipo: "postagens" } });
    });

    it("propaga erro sem tratar (mesma regra de VagasService/SeguidorService)", async () => {
      (clienteApi.get as jest.Mock).mockRejectedValue(new Error("Network Error"));

      await expect(BuscaService.buscarPostagens("oi")).rejects.toThrow("Network Error");
    });
  });
});
