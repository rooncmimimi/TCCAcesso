/* eslint-disable import/first -- `jest.mock` precisa vir antes dos imports dos módulos que ele substitui. */
jest.mock("../../services/api/cliente", () => ({
  clienteApi: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { clienteApi } from "../../services/api/cliente";
import { FeedService } from "../FeedService";

const postagemExemplo = {
  id: "p1",
  conteudo: "Uma publicação de teste.",
  publica: true,
  criadoEm: "2026-01-01T00:00:00.000Z",
  usuario: { id: "u1", nome: "Ana", fotoPerfil: null, tipoUsuario: "candidato" },
  totalCurtidas: 0,
  curtidoPorMim: false,
  totalComentarios: 0,
};

describe("FeedService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listar", () => {
    it("chama GET /postagens com os parâmetros de página e devolve o envelope intacto", async () => {
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, postagens: [postagemExemplo] };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await FeedService.listar({ page: 1, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/postagens", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });

    it("sem parâmetros, chama GET /postagens com params vazio", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({
        data: { sucesso: true, total: 0, pagina: 1, limite: 10, totalPaginas: 0, postagens: [] },
      });

      await FeedService.listar();

      expect(clienteApi.get).toHaveBeenCalledWith("/postagens", { params: {} });
    });
  });

  describe("obterPorId", () => {
    it("chama GET /postagens/:id e devolve só a publicação, desembrulhada", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, postagem: postagemExemplo } });

      await expect(FeedService.obterPorId("p1")).resolves.toEqual(postagemExemplo);
      expect(clienteApi.get).toHaveBeenCalledWith("/postagens/p1");
    });
  });

  describe("criar", () => {
    it("sem anexos, chama POST /postagens em JSON puro (sem FormData) com conteudo e publica:true, e devolve só a publicação", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, postagem: postagemExemplo } });

      const resposta = await FeedService.criar({ conteudo: "Uma publicação de teste." });

      expect(clienteApi.post).toHaveBeenCalledWith("/postagens", {
        conteudo: "Uma publicação de teste.",
        publica: true,
      });
      expect(resposta).toEqual(postagemExemplo);
    });

    it("em erro (ex.: validação), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("400"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(FeedService.criar({ conteudo: "" })).rejects.toBe(erro);
    });

    it("com anexos, chama POST /postagens em multipart com arquivos + descricoesAnexos posicional", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, postagem: postagemExemplo } });

      await FeedService.criar({
        conteudo: "Com foto.",
        anexos: [
          { arquivo: { uri: "file:///a.jpg", nome: "a.jpg", mimeType: "image/jpeg", tamanhoBytes: 100 }, descricao: "Uma foto." },
          { arquivo: { uri: "file:///b.jpg", nome: "b.jpg", mimeType: "image/jpeg", tamanhoBytes: 200 }, descricao: "" },
        ],
      });

      expect(clienteApi.post).toHaveBeenCalledWith("/postagens", expect.any(FormData), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const formData = (clienteApi.post as jest.Mock).mock.calls[0][1] as FormData;
      expect(formData.get("conteudo")).toBe("Com foto.");
      expect(formData.get("publica")).toBe("true");
      expect(formData.get("descricoesAnexos")).toBe(JSON.stringify(["Uma foto.", null]));
      expect(formData.getAll("arquivos")).toHaveLength(2);
    });
  });

  describe("atualizar", () => {
    it("chama PUT /postagens/:id e devolve só a publicação", async () => {
      (clienteApi.put as jest.Mock).mockResolvedValue({ data: { sucesso: true, postagem: postagemExemplo } });

      await expect(FeedService.atualizar("p1", { conteudo: "Editado." })).resolves.toEqual(postagemExemplo);
      expect(clienteApi.put).toHaveBeenCalledWith("/postagens/p1", { conteudo: "Editado." });
    });
  });

  describe("remover", () => {
    it("chama DELETE /postagens/:id e devolve a mensagem", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "Postagem removida com sucesso." } });

      await expect(FeedService.remover("p1")).resolves.toEqual({ mensagem: "Postagem removida com sucesso." });
      expect(clienteApi.delete).toHaveBeenCalledWith("/postagens/p1");
    });
  });

  describe("atualizarDescricaoAnexo", () => {
    it("chama PATCH /postagens/:id/anexos/:anexoId com a descrição e devolve a publicação atualizada", async () => {
      (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, postagem: postagemExemplo } });

      await expect(FeedService.atualizarDescricaoAnexo("p1", "a1", "Nova descrição.")).resolves.toEqual(postagemExemplo);
      expect(clienteApi.patch).toHaveBeenCalledWith("/postagens/p1/anexos/a1", { descricao: "Nova descrição." });
    });

    it("aceita null para remover a descrição", async () => {
      (clienteApi.patch as jest.Mock).mockResolvedValue({ data: { sucesso: true, postagem: postagemExemplo } });

      await FeedService.atualizarDescricaoAnexo("p1", "a1", null);

      expect(clienteApi.patch).toHaveBeenCalledWith("/postagens/p1/anexos/a1", { descricao: null });
    });
  });

  describe("obterUrlAnexo", () => {
    it("chama GET /postagens/:id/anexos/:anexoId/url e devolve {url, expiraEm}", async () => {
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: { sucesso: true, url: "https://x/y.jpg", expiraEm: "2026-01-01T00:05:00.000Z" } });

      await expect(FeedService.obterUrlAnexo("p1", "a1")).resolves.toEqual({
        url: "https://x/y.jpg",
        expiraEm: "2026-01-01T00:05:00.000Z",
      });
      expect(clienteApi.get).toHaveBeenCalledWith("/postagens/p1/anexos/a1/url");
    });
  });

  describe("sugerirDescricao", () => {
    it("chama POST /postagens/anexos/sugerir-descricao em multipart e devolve a descrição sugerida", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, descricao: "Uma pessoa sorrindo." } });

      const resposta = await FeedService.sugerirDescricao({ uri: "file:///a.jpg", nome: "a.jpg", mimeType: "image/jpeg", tamanhoBytes: 100 });

      expect(resposta).toBe("Uma pessoa sorrindo.");
      expect(clienteApi.post).toHaveBeenCalledWith("/postagens/anexos/sugerir-descricao", expect.any(FormData), {
        headers: { "Content-Type": "multipart/form-data" },
      });
    });

    it("em erro (ex.: indisponível/limite de taxa), propaga o erro sem engolir — o chamador trata como sugestão indisponível", async () => {
      const erro = Object.assign(new Error("503"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(
        FeedService.sugerirDescricao({ uri: "file:///a.jpg", nome: "a.jpg", mimeType: "image/jpeg", tamanhoBytes: 100 }),
      ).rejects.toBe(erro);
    });
  });

  describe("alternarCurtida", () => {
    it("chama POST /postagens/:postagemId/curtidas e devolve {curtido:true, totalCurtidas} do servidor", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, curtido: true, totalCurtidas: 1 } });

      await expect(FeedService.alternarCurtida("p1")).resolves.toEqual({ curtido: true, totalCurtidas: 1 });
      expect(clienteApi.post).toHaveBeenCalledWith("/postagens/p1/curtidas");
    });

    it("no sentido contrário (descurtir), devolve curtido:false", async () => {
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, curtido: false, totalCurtidas: 0 } });

      await expect(FeedService.alternarCurtida("p1")).resolves.toEqual({ curtido: false, totalCurtidas: 0 });
    });
  });

  describe("listarComentarios", () => {
    it("chama GET /postagens/:postagemId/comentarios com os parâmetros de página e devolve o envelope intacto", async () => {
      const comentarioExemplo = {
        id: "c1",
        comentario: "Um comentário.",
        criadoEm: "2026-01-01T00:00:00.000Z",
        usuario: { id: "u2", nome: "Bia" },
        respostas: [],
      };
      const envelope = { sucesso: true, total: 1, pagina: 1, limite: 10, totalPaginas: 1, comentarios: [comentarioExemplo] };
      (clienteApi.get as jest.Mock).mockResolvedValue({ data: envelope });

      const resposta = await FeedService.listarComentarios("p1", { page: 1, limit: 10 });

      expect(clienteApi.get).toHaveBeenCalledWith("/postagens/p1/comentarios", { params: { page: 1, limit: 10 } });
      expect(resposta).toEqual(envelope);
    });
  });

  describe("criarComentario", () => {
    it("chama POST /postagens/:postagemId/comentarios só com o texto quando não é resposta, e devolve só o comentário", async () => {
      const comentario = { id: "c1", comentario: "Um comentário.", criadoEm: "2026-01-01T00:00:00.000Z" };
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, comentario } });

      const resposta = await FeedService.criarComentario("p1", "Um comentário.");

      expect(clienteApi.post).toHaveBeenCalledWith("/postagens/p1/comentarios", {
        comentario: "Um comentário.",
        comentarioPaiId: undefined,
      });
      expect(resposta).toEqual(comentario);
    });

    it("quando é resposta, envia comentarioPaiId junto", async () => {
      const comentario = { id: "c2", comentario: "Uma resposta.", comentarioPaiId: "c1", criadoEm: "2026-01-01T00:00:00.000Z" };
      (clienteApi.post as jest.Mock).mockResolvedValue({ data: { sucesso: true, comentario } });

      await FeedService.criarComentario("p1", "Uma resposta.", "c1");

      expect(clienteApi.post).toHaveBeenCalledWith("/postagens/p1/comentarios", {
        comentario: "Uma resposta.",
        comentarioPaiId: "c1",
      });
    });

    it("em erro (ex.: comentarioPaiId de outra postagem, 404), propaga o erro sem engolir", async () => {
      const erro = Object.assign(new Error("404"), { isAxiosError: true });
      (clienteApi.post as jest.Mock).mockRejectedValue(erro);

      await expect(FeedService.criarComentario("p1", "texto", "invalido")).rejects.toBe(erro);
    });
  });

  describe("removerComentario", () => {
    it("chama DELETE /comentarios/:id e devolve a mensagem do backend", async () => {
      (clienteApi.delete as jest.Mock).mockResolvedValue({ data: { sucesso: true, mensagem: "Comentário removido com sucesso." } });

      const resposta = await FeedService.removerComentario("c1");

      expect(clienteApi.delete).toHaveBeenCalledWith("/comentarios/c1");
      expect(resposta).toEqual({ mensagem: "Comentário removido com sucesso." });
    });

    it("propaga erro (ex.: 403 de comentário de outra pessoa) sem engolir", async () => {
      const erro = Object.assign(new Error("403"), { isAxiosError: true });
      (clienteApi.delete as jest.Mock).mockRejectedValue(erro);

      await expect(FeedService.removerComentario("alheio")).rejects.toBe(erro);
    });
  });
});
