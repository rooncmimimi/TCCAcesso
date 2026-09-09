/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { EmpresaService } from "../EmpresaService";

const empresaExemplo = { id: "e1", usuarioId: "u1", razaoSocial: "ACME Ltda", nomeFantasia: "ACME" };

describe("EmpresaService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("obterPorId", () => {
    it("chama GET /empresas/:id e devolve só a empresa, desembrulhada", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, empresa: empresaExemplo } });

      await expect(EmpresaService.obterPorId("e1")).resolves.toEqual(empresaExemplo);
      expect(apiClient.get).toHaveBeenCalledWith("/empresas/e1");
    });
  });

  describe("obterPorUsuario", () => {
    it("chama GET /empresas/usuario/:usuarioId e devolve só a empresa", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, empresa: empresaExemplo } });

      await expect(EmpresaService.obterPorUsuario("u1")).resolves.toEqual(empresaExemplo);
      expect(apiClient.get).toHaveBeenCalledWith("/empresas/usuario/u1");
    });

    it("em erro (ex.: usuário sem empresa vinculada), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (apiClient.get as jest.Mock).mockRejectedValue(erro);

      await expect(EmpresaService.obterPorUsuario("u1")).rejects.toBe(erro);
    });
  });

  describe("meuPerfil", () => {
    it("chama GET /empresas/me e devolve só a empresa", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, empresa: empresaExemplo } });

      await expect(EmpresaService.meuPerfil()).resolves.toEqual(empresaExemplo);
      expect(apiClient.get).toHaveBeenCalledWith("/empresas/me");
    });

    it("propaga erro (ex.: conta sem registro de empresa → 404)", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (apiClient.get as jest.Mock).mockRejectedValue(erro);

      await expect(EmpresaService.meuPerfil()).rejects.toBe(erro);
    });
  });

  describe("atualizar", () => {
    it("chama PUT /empresas/:id com os dados e devolve a empresa atualizada", async () => {
      const atualizada = { ...empresaExemplo, descricao: "Nova descrição." };
      (apiClient.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, empresa: atualizada } });

      const resultado = await EmpresaService.atualizar("e1", { descricao: "Nova descrição." });

      expect(apiClient.put).toHaveBeenCalledWith("/empresas/e1", { descricao: "Nova descrição." });
      expect(resultado).toEqual(atualizada);
    });

    it("propaga erro (ex.: empresa ainda não aprovada → 403)", async () => {
      const erro = Object.assign(new Error("403"), { isAxiosError: true });
      (apiClient.put as jest.Mock).mockRejectedValue(erro);

      await expect(EmpresaService.atualizar("e1", { descricao: "x" })).rejects.toBe(erro);
    });
  });
});
