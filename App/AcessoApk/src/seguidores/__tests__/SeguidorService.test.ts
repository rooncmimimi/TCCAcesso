/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from "../../services/api/client";
import { SeguidorService } from "../SeguidorService";

describe("SeguidorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("obterUsuarioPublicoBasico", () => {
    it("chama GET /perfil/usuario/:usuarioId e devolve só o usuário", async () => {
      const usuario = { id: "u1", nome: "Ana", tipoUsuario: "candidato", perfilPublico: true };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, usuario } });

      await expect(SeguidorService.obterUsuarioPublicoBasico("u1")).resolves.toEqual(usuario);
      expect(apiClient.get).toHaveBeenCalledWith("/perfil/usuario/u1");
    });
  });

  describe("alternarSeguirUsuario", () => {
    it("chama POST /seguir/usuarios/:usuarioId e devolve {seguindo,totalSeguidores}", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, seguindo: true, totalSeguidores: 5 } });

      await expect(SeguidorService.alternarSeguirUsuario("u1")).resolves.toEqual({ seguindo: true, totalSeguidores: 5 });
      expect(apiClient.post).toHaveBeenCalledWith("/seguir/usuarios/u1");
    });

    it("em erro (ex.: 403 perfil privado), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("403"), { isAxiosError: true });
      (apiClient.post as jest.Mock).mockRejectedValue(erro);

      await expect(SeguidorService.alternarSeguirUsuario("u1")).rejects.toBe(erro);
    });
  });

  describe("alternarSeguirEmpresa", () => {
    it("chama POST /seguir/empresas/:empresaId", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, seguindo: false, totalSeguidores: 3 } });

      await expect(SeguidorService.alternarSeguirEmpresa("e1")).resolves.toEqual({ seguindo: false, totalSeguidores: 3 });
      expect(apiClient.post).toHaveBeenCalledWith("/seguir/empresas/e1");
    });
  });

  describe("solicitarSeguir", () => {
    it("perfil privado: chama POST /seguir/solicitacoes/:destinatarioId e devolve solicitacaoCriada:true", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, seguindo: false, solicitacaoCriada: true, solicitacaoPendente: true },
      });

      const resposta = await SeguidorService.solicitarSeguir("u1");

      expect(apiClient.post).toHaveBeenCalledWith("/seguir/solicitacoes/u1");
      expect(resposta.solicitacaoCriada).toBe(true);
    });

    it("alvo virou público entre o clique e a chamada: backend já segue direto (solicitacaoCriada:false)", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, seguindo: true, totalSeguidores: 4, solicitacaoCriada: false },
      });

      const resposta = await SeguidorService.solicitarSeguir("u1");

      expect(resposta).toEqual({ sucesso: true, seguindo: true, totalSeguidores: 4, solicitacaoCriada: false });
    });
  });

  describe("cancelarSolicitacao", () => {
    it("chama DELETE /seguir/solicitacoes/:destinatarioId", async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await SeguidorService.cancelarSolicitacao("u1");

      expect(apiClient.delete).toHaveBeenCalledWith("/seguir/solicitacoes/u1");
    });
  });

  describe("aceitarSolicitacao / recusarSolicitacao", () => {
    it("aceitarSolicitacao chama POST /seguir/solicitacoes/:id/aceitar", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await SeguidorService.aceitarSolicitacao("s1");

      expect(apiClient.post).toHaveBeenCalledWith("/seguir/solicitacoes/s1/aceitar");
    });

    it("recusarSolicitacao chama POST /seguir/solicitacoes/:id/recusar", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await SeguidorService.recusarSolicitacao("s1");

      expect(apiClient.post).toHaveBeenCalledWith("/seguir/solicitacoes/s1/recusar");
    });
  });

  describe("listarSeguidores / listarSeguindo", () => {
    it("listarSeguidores chama GET /seguir/seguidores/:usuarioId com paginação e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, seguidores: [{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await SeguidorService.listarSeguidores("u1", { page: 1, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith("/seguir/seguidores/u1", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("listarSeguindo chama GET /seguir/seguindo/:usuarioId", async () => {
      const envelope = { sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, seguindo: [] };
      (apiClient.get as jest.Mock).mockResolvedValue({ data: envelope });

      await SeguidorService.listarSeguindo("u1");

      expect(apiClient.get).toHaveBeenCalledWith("/seguir/seguindo/u1", { params: {} });
    });
  });

  describe("resumo / resumoEmpresa", () => {
    it("resumo: chama GET /seguir/resumo/:usuarioId e devolve o estado sem o envelope 'sucesso'", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          sucesso: true,
          totalSeguidores: 10,
          totalSeguindo: 5,
          seguindoEsteUsuario: true,
          perfilPublico: true,
          elesSeguemVoce: false,
          solicitacaoPendente: false,
          bloqueado: false,
        },
      });

      const resposta = await SeguidorService.resumo("u1");

      expect(apiClient.get).toHaveBeenCalledWith("/seguir/resumo/u1");
      expect(resposta).toEqual({
        totalSeguidores: 10,
        totalSeguindo: 5,
        seguindoEsteUsuario: true,
        perfilPublico: true,
        elesSeguemVoce: false,
        solicitacaoPendente: false,
        bloqueado: false,
      });
      expect(resposta).not.toHaveProperty("sucesso");
    });

    it("resumoEmpresa: chama GET /seguir/resumo/empresas/:empresaId", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, totalSeguidores: 7, seguindoEstaEmpresa: false },
      });

      const resposta = await SeguidorService.resumoEmpresa("e1");

      expect(apiClient.get).toHaveBeenCalledWith("/seguir/resumo/empresas/e1");
      expect(resposta).toEqual({ totalSeguidores: 7, seguindoEstaEmpresa: false });
    });
  });

  describe("sugestoesPessoas / sugestoesEmpresas", () => {
    it("sugestoesPessoas: chama GET /seguir/sugestoes com o limite e devolve a lista", async () => {
      const sugestoes = [{ id: "u2", nome: "Bia", fotoPerfil: null, tipo: "candidato", titulo: "Dev", motivo: "Também está em SP" }];
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, sugestoes } });

      const resposta = await SeguidorService.sugestoesPessoas(8);

      expect(apiClient.get).toHaveBeenCalledWith("/seguir/sugestoes", { params: { limit: 8 } });
      expect(resposta).toEqual(sugestoes);
    });

    it("sugestoesEmpresas: chama GET /seguir/sugestoes/empresas", async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, sugestoes: [] } });

      await SeguidorService.sugestoesEmpresas();

      expect(apiClient.get).toHaveBeenCalledWith("/seguir/sugestoes/empresas", { params: { limit: undefined } });
    });
  });
});
