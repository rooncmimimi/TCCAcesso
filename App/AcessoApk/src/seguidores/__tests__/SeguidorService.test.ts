/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

import { clienteApi } from "../../services/api/cliente";
import { SeguidorService } from "../SeguidorService";

describe("SeguidorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("obterUsuarioPublicoBasico", () => {
    it("chama GET /perfil/usuario/:usuarioId e devolve só o usuário", async () => {
      const usuario = { id: "u1", nome: "Ana", tipoUsuario: "candidato", perfilPublico: true };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, usuario } });

      await expect(SeguidorService.obterUsuarioPublicoBasico("u1")).resolves.toEqual(usuario);
      expect(clienteApi.get).toHaveBeenCalledWith("/perfil/usuario/u1");
    });
  });

  describe("alternarSeguirUsuario", () => {
    it("chama POST /seguir/usuarios/:usuarioId e devolve {seguindo,totalSeguidores}", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, seguindo: true, totalSeguidores: 5 } });

      await expect(SeguidorService.alternarSeguirUsuario("u1")).resolves.toEqual({ seguindo: true, totalSeguidores: 5 });
      expect(clienteApi.post).toHaveBeenCalledWith("/seguir/usuarios/u1");
    });

    it("em erro (ex.: 403 perfil privado), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("403"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(SeguidorService.alternarSeguirUsuario("u1")).rejects.toBe(erro);
    });
  });

  describe("alternarSeguirEmpresa", () => {
    it("chama POST /seguir/empresas/:empresaId", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, seguindo: false, totalSeguidores: 3 } });

      await expect(SeguidorService.alternarSeguirEmpresa("e1")).resolves.toEqual({ seguindo: false, totalSeguidores: 3 });
      expect(clienteApi.post).toHaveBeenCalledWith("/seguir/empresas/e1");
    });
  });

  describe("solicitarSeguir", () => {
    it("perfil privado: chama POST /seguir/solicitacoes/:destinatarioId e devolve solicitacaoCriada:true", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, seguindo: false, solicitacaoCriada: true, solicitacaoPendente: true },
      });

      const resposta = await SeguidorService.solicitarSeguir("u1");

      expect(clienteApi.post).toHaveBeenCalledWith("/seguir/solicitacoes/u1");
      expect(resposta.solicitacaoCriada).toBe(true);
    });

    it("alvo virou público entre o clique e a chamada: backend já segue direto (solicitacaoCriada:false)", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({
        data: { sucesso: true, seguindo: true, totalSeguidores: 4, solicitacaoCriada: false },
      });

      const resposta = await SeguidorService.solicitarSeguir("u1");

      expect(resposta).toEqual({ sucesso: true, seguindo: true, totalSeguidores: 4, solicitacaoCriada: false });
    });
  });

  describe("cancelarSolicitacao", () => {
    it("chama DELETE /seguir/solicitacoes/:destinatarioId", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await SeguidorService.cancelarSolicitacao("u1");

      expect(clienteApi.delete).toHaveBeenCalledWith("/seguir/solicitacoes/u1");
    });
  });

  describe("aceitarSolicitacao / recusarSolicitacao", () => {
    it("aceitarSolicitacao chama POST /seguir/solicitacoes/:id/aceitar", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await SeguidorService.aceitarSolicitacao("s1");

      expect(clienteApi.post).toHaveBeenCalledWith("/seguir/solicitacoes/s1/aceitar");
    });

    it("recusarSolicitacao chama POST /seguir/solicitacoes/:id/recusar", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true } });

      await SeguidorService.recusarSolicitacao("s1");

      expect(clienteApi.post).toHaveBeenCalledWith("/seguir/solicitacoes/s1/recusar");
    });
  });

  describe("listarSeguidores / listarSeguindo", () => {
    it("listarSeguidores chama GET /seguir/seguidores/:usuarioId com paginação e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, seguidores: [{ id: "u2", nome: "Bia", tipoUsuario: "candidato" }] };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await SeguidorService.listarSeguidores("u1", { page: 1, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/seguir/seguidores/u1", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("listarSeguindo chama GET /seguir/seguindo/:usuarioId", async () => {
      const envelope = { sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, seguindo: [] };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      await SeguidorService.listarSeguindo("u1");

      expect(clienteApi.get).toHaveBeenCalledWith("/seguir/seguindo/u1", { params: {} });
    });
  });

  describe("resumo / resumoEmpresa", () => {
    it("resumo: chama GET /seguir/resumo/:usuarioId e devolve o estado sem o envelope 'sucesso'", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
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

      expect(clienteApi.get).toHaveBeenCalledWith("/seguir/resumo/u1");
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
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, totalSeguidores: 7, seguindoEstaEmpresa: false },
      });

      const resposta = await SeguidorService.resumoEmpresa("e1");

      expect(clienteApi.get).toHaveBeenCalledWith("/seguir/resumo/empresas/e1");
      expect(resposta).toEqual({ totalSeguidores: 7, seguindoEstaEmpresa: false });
    });
  });

  describe("sugestoesPessoas / sugestoesEmpresas", () => {
    it("sugestoesPessoas: chama GET /seguir/sugestoes com o limite e devolve a lista", async () => {
      const sugestoes = [{ id: "u2", nome: "Bia", fotoPerfil: null, tipo: "candidato", titulo: "Dev", motivo: "Também está em SP" }];
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, sugestoes } });

      const resposta = await SeguidorService.sugestoesPessoas(8);

      expect(clienteApi.get).toHaveBeenCalledWith("/seguir/sugestoes", { params: { limit: 8 } });
      expect(resposta).toEqual(sugestoes);
    });

    it("sugestoesEmpresas: chama GET /seguir/sugestoes/empresas", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, sugestoes: [] } });

      await SeguidorService.sugestoesEmpresas();

      expect(clienteApi.get).toHaveBeenCalledWith("/seguir/sugestoes/empresas", { params: { limit: undefined } });
    });
  });
});
