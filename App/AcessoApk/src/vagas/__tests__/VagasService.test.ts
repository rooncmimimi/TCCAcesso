/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { clienteApi } from "../../services/api/cliente";
import { VagasService } from "../VagasService";

const vagaExemplo = {
  id: "v1",
  titulo: "Desenvolvedor Front-end",
  descricao: "...",
  modalidade: "remoto" as const,
  status: "aberta" as const,
};

describe("VagasService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listar", () => {
    it("chama GET /vagas com os parâmetros de página e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, vagas: [vagaExemplo] };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await VagasService.listar({ page: 1, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/vagas", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("sem parâmetros, chama GET /vagas com params vazio", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, vagas: [] },
      });

      await VagasService.listar();

      expect(clienteApi.get).toHaveBeenCalledWith("/vagas", { params: {} });
    });
  });

  describe("obterPorId", () => {
    it("chama GET /vagas/:id e devolve só a vaga, desembrulhada", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, vaga: vagaExemplo } });

      await expect(VagasService.obterPorId("v1")).resolves.toEqual(vagaExemplo);
      expect(clienteApi.get).toHaveBeenCalledWith("/vagas/v1");
    });
  });

  describe("candidatarSe", () => {
    it("chama POST /vagas/:vagaId/candidaturas e devolve só a candidatura", async () => {
      const candidatura = { id: "c1", status: "pendente" };
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidatura } });

      const resposta = await VagasService.candidatarSe("v1", "Tenho muito interesse.");

      expect(clienteApi.post).toHaveBeenCalledWith("/vagas/v1/candidaturas", { mensagem: "Tenho muito interesse." });
      expect(resposta).toEqual(candidatura);
    });

    it("em erro (ex.: 409 já candidatado), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("409"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(VagasService.candidatarSe("v1")).rejects.toBe(erro);
    });
  });

  describe("favoritar", () => {
    it("chama POST /vagas/:vagaId/favoritar e devolve o boolean do servidor (true)", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, favoritado: true } });

      await expect(VagasService.favoritar("v1")).resolves.toBe(true);
      expect(clienteApi.post).toHaveBeenCalledWith("/vagas/v1/favoritar");
    });

    it("no sentido contrário (desfavoritar), devolve false", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, favoritado: false } });

      await expect(VagasService.favoritar("v1")).resolves.toBe(false);
    });
  });

  describe("Modo Empresa", () => {
    describe("minhas", () => {
      it("chama GET /vagas/minhas com os parâmetros e devolve o envelope intacto", async () => {
        const vagaComContagem = { ...vagaExemplo, totalCandidaturas: 3 };
        const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, vagas: [vagaComContagem] };
        (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

        const resposta = await VagasService.minhas({ page: 1, limit: 10, status: "aberta" });

        expect(clienteApi.get).toHaveBeenCalledWith("/vagas/minhas", { params: { page: 1, limit: 10, status: "aberta" } });
        expect(resposta).toEqual(envelope);
      });

      it("propaga erro (ex.: empresa não aprovada → 403)", async () => {
        const erro = Object.assign(new Error("403"), { isAxiosError: true });
        (clienteApi.get as jest.Mock).mockRejectedValue(erro);

        await expect(VagasService.minhas()).rejects.toBe(erro);
      });
    });

    describe("criar", () => {
      it("chama POST /vagas com os dados e devolve só a vaga", async () => {
        (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, vaga: vagaExemplo } });

        const dados = { titulo: "Desenvolvedor Front-end", descricao: "...", modalidade: "remoto" as const };
        const resultado = await VagasService.criar(dados);

        expect(clienteApi.post).toHaveBeenCalledWith("/vagas", dados);
        expect(resultado).toEqual(vagaExemplo);
      });
    });

    describe("atualizar", () => {
      it("chama PUT /vagas/:id com os dados e devolve a vaga atualizada", async () => {
        const atualizada = { ...vagaExemplo, titulo: "Dev Front-end Sênior" };
        (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, vaga: atualizada } });

        const resultado = await VagasService.atualizar("v1", { titulo: "Dev Front-end Sênior" });

        expect(clienteApi.put).toHaveBeenCalledWith("/vagas/v1", { titulo: "Dev Front-end Sênior" });
        expect(resultado).toEqual(atualizada);
      });
    });

    describe("alterarStatus", () => {
      it("chama PATCH /vagas/:id/status com o novo status", async () => {
        const pausada = { ...vagaExemplo, status: "pausada" as const };
        (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, vaga: pausada } });

        const resultado = await VagasService.alterarStatus("v1", "pausada");

        expect(clienteApi.patch).toHaveBeenCalledWith("/vagas/v1/status", { status: "pausada" });
        expect(resultado).toEqual(pausada);
      });
    });

    describe("remover", () => {
      it("chama DELETE /vagas/:id", async () => {
        (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "ok" } });

        await VagasService.remover("v1");

        expect(clienteApi.delete).toHaveBeenCalledWith("/vagas/v1");
      });

      it("propaga erro", async () => {
        const erro = Object.assign(new Error("403"), { isAxiosError: true });
        (clienteApi.delete as jest.Mock).mockRejectedValue(erro);

        await expect(VagasService.remover("v1")).rejects.toBe(erro);
      });
    });

    describe("listarCandidaturas", () => {
      it("chama GET /vagas/:vagaId/candidaturas com os parâmetros e devolve o envelope intacto", async () => {
        const candidatura = { id: "c1", status: "pendente", candidato: { id: "cd1", usuarioId: "u2", usuario: { id: "u2", nome: "Ana", email: "ana@x.com", fotoPerfil: null } } };
        const envelope = { sucesso: true, total: 1, pagina: 1, limite: 20, totalPaginas: 1, candidaturas: [candidatura] };
        (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

        const resposta = await VagasService.listarCandidaturas("v1", { page: 1, limit: 20 });

        expect(clienteApi.get).toHaveBeenCalledWith("/vagas/v1/candidaturas", { params: { page: 1, limit: 20 } });
        expect(resposta).toEqual(envelope);
      });
    });

    describe("atualizarStatusCandidatura", () => {
      it("chama PATCH /candidaturas/:id/status (rota separada de /vagas) e devolve só a candidatura", async () => {
        const aprovada = { id: "c1", status: "aprovada" };
        (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, candidatura: aprovada } });

        const resultado = await VagasService.atualizarStatusCandidatura("c1", "aprovada");

        expect(clienteApi.patch).toHaveBeenCalledWith("/candidaturas/c1/status", { status: "aprovada" });
        expect(resultado).toEqual(aprovada);
      });

      it("propaga erro (ex.: status não permitido pra empresa → 400)", async () => {
        const erro = Object.assign(new Error("400"), { isAxiosError: true });
        (clienteApi.patch as jest.Mock).mockRejectedValue(erro);

        await expect(VagasService.atualizarStatusCandidatura("c1", "pendente")).rejects.toBe(erro);
      });
    });
  });
});
