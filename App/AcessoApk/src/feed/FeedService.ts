import { clienteApi } from "../services/api/cliente";
import type {
  AlternarCurtidaResposta,
  AnexoSelecionado,
  AtualizarDescricaoAnexoResposta,
  AtualizarPostagemDados,
  Comentario,
  CriarComentarioResposta,
  CriarPostagemDados,
  CriarPostagemResposta,
  GerarUrlAnexoResposta,
  ListaComentariosResposta,
  ListaPostagensResposta,
  ListarComentariosParametros,
  ListarPostagensParametros,
  Postagem,
  PostagemDetalheResposta,
  RemoverComentarioResposta,
  RemoverPostagemResposta,
  SugerirDescricaoResposta,
} from "./types";

/**
 * O React Native aceita `{ uri, name, type }` em `FormData.append` para enviar um arquivo local.
 * Não é um `Blob` de verdade, daí o cast.
 */
function parteDoArquivo(arquivo: AnexoSelecionado): Blob {
  return {
    uri: arquivo.uri,
    name: arquivo.nome || "anexo",
    type: arquivo.mimeType || "application/octet-stream",
  } as unknown as Blob;
}

/** Publicações, anexos, curtidas e comentários do feed. */
export const FeedService = {
  /**
   * `GET /postagens`. O app só pagina; a API também aceita filtros (`usuarioId`, `escopo=seguindo`,
   * `q`) que ainda não são usados aqui.
   */
  async listar(parametros: ListarPostagensParametros = {}): Promise<ListaPostagensResposta> {
    const { data } = await clienteApi.get<ListaPostagensResposta>("/postagens", { params: parametros });
    return data;
  },

  /** `GET /postagens/:id`: devolve só a publicação, não o envelope. */
  async obterPorId(id: string): Promise<Postagem> {
    const { data } = await clienteApi.get<PostagemDetalheResposta>(`/postagens/${id}`);
    return data.postagem;
  },

  /**
   * `POST /postagens`. Sem anexos, vai como JSON. Com anexos, vira `multipart/form-data`: cada
   * arquivo em `arquivos` (até 4) e `descricoesAnexos` como JSON de um array de strings na mesma
   * ordem dos arquivos, formato exigido por `postagemValidator.js`.
   */
  async criar(dados: CriarPostagemDados): Promise<Postagem> {
    const publica = dados.publica === undefined ? true : dados.publica;

    if (!dados.anexos || dados.anexos.length === 0) {
      const { data } = await clienteApi.post<CriarPostagemResposta>("/postagens", {
        conteudo: dados.conteudo,
        publica,
      });
      return data.postagem;
    }

    const formData = new FormData();
    if (dados.conteudo) formData.append("conteudo", dados.conteudo);
    formData.append("publica", String(publica));
    dados.anexos.forEach((anexo) => formData.append("arquivos", parteDoArquivo(anexo.arquivo)));
    formData.append("descricoesAnexos", JSON.stringify(dados.anexos.map((anexo) => anexo.descricao.trim() || null)));

    const { data } = await clienteApi.post<CriarPostagemResposta>("/postagens", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.postagem;
  },

  /**
   * `PUT /postagens/:id`: só o autor. Não altera os anexos; para trocar a mídia é preciso excluir e
   * publicar de novo.
   */
  async atualizar(id: string, dados: AtualizarPostagemDados): Promise<Postagem> {
    const { data } = await clienteApi.put<CriarPostagemResposta>(`/postagens/${id}`, dados);
    return data.postagem;
  },

  /** `DELETE /postagens/:id`: exclusão lógica (`ativo=false`) feita pelo autor. */
  async remover(id: string): Promise<{ mensagem: string }> {
    const { data } = await clienteApi.delete<RemoverPostagemResposta>(`/postagens/${id}`);
    return { mensagem: data.mensagem };
  },

  /**
   * `PATCH /postagens/:id/anexos/:anexoId`: edita só a descrição acessível
   * de um anexo já publicado (nunca o arquivo em si). `descricao: null`
   * remove a descrição existente (contrato do backend, `validarDescricaoAnexo`).
   */
  async atualizarDescricaoAnexo(postagemId: string, anexoId: string, descricao: string | null): Promise<Postagem> {
    const { data } = await clienteApi.patch<AtualizarDescricaoAnexoResposta>(
      `/postagens/${postagemId}/anexos/${anexoId}`,
      { descricao },
    );
    return data.postagem;
  },

  /**
   * `GET /postagens/:id/anexos/:anexoId/url`. Só é usado quando a URL que veio na publicação expira
   * e a imagem falha ao carregar (`AnexoImagem.tsx`).
   */
  async obterUrlAnexo(postagemId: string, anexoId: string): Promise<{ url: string; expiraEm: string | null }> {
    const { data } = await clienteApi.get<GerarUrlAnexoResposta>(`/postagens/${postagemId}/anexos/${anexoId}/url`);
    return { url: data.url, expiraEm: data.expiraEm };
  },

  /**
   * `POST /postagens/anexos/sugerir-descricao`: pede à IA uma descrição para a imagem, sem gravar
   * nada (campo multipart `imagem`, com limite de requisições no backend). Se falhar (IA não
   * configurada, limite atingido, imagem não reconhecida), quem chama trata como sugestão
   * indisponível: a pessoa continua podendo escrever a descrição e publicar.
   */
  async sugerirDescricao(arquivo: AnexoSelecionado): Promise<string> {
    const formData = new FormData();
    formData.append("imagem", parteDoArquivo(arquivo));

    const { data } = await clienteApi.post<SugerirDescricaoResposta>("/postagens/anexos/sugerir-descricao", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.descricao;
  },

  /**
   * `POST /postagens/:postagemId/curtidas`: a mesma rota curte e descurte. Devolve o estado
   * calculado pelo servidor; a tela só muda depois da resposta.
   */
  async alternarCurtida(postagemId: string): Promise<{ curtido: boolean; totalCurtidas: number }> {
    const { data } = await clienteApi.post<AlternarCurtidaResposta>(`/postagens/${postagemId}/curtidas`);
    return { curtido: data.curtido, totalCurtidas: data.totalCurtidas };
  },

  /** `GET /postagens/:postagemId/comentarios`: só comentários de nível raiz; cada um já vem com `respostas` (1 nível) embutidas pelo backend. */
  async listarComentarios(
    postagemId: string,
    parametros: ListarComentariosParametros = {},
  ): Promise<ListaComentariosResposta> {
    const { data } = await clienteApi.get<ListaComentariosResposta>(`/postagens/${postagemId}/comentarios`, {
      params: parametros,
    });
    return data;
  },

  /**
   * `POST /postagens/:postagemId/comentarios`. `comentarioPaiId` só é enviado ao responder um
   * comentário raiz (há um único nível de resposta). O backend valida o comentário pai, então a
   * checagem não se repete aqui.
   */
  async criarComentario(postagemId: string, comentario: string, comentarioPaiId?: string): Promise<Comentario> {
    const { data } = await clienteApi.post<CriarComentarioResposta>(`/postagens/${postagemId}/comentarios`, {
      comentario,
      comentarioPaiId,
    });
    return data.comentario;
  },

  /**
   * `DELETE /comentarios/:id`: exclusão lógica pelo autor; o backend recusa com 403 para outra
   * pessoa e emite `feed:comentario` com `removido: true`. A tela só oferece a ação nos comentários
   * do próprio usuário.
   */
  async removerComentario(comentarioId: string): Promise<{ mensagem: string }> {
    const { data } = await clienteApi.delete<RemoverComentarioResposta>(`/comentarios/${comentarioId}`);
    return { mensagem: data.mensagem };
  },
};
