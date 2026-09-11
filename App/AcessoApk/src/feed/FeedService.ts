import { apiClient } from "../services/api/client";
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

/** `React Native` aceita `{uri, name, type}` como valor de `FormData.append` para representar um arquivo local — mesma técnica já usada em `PerfilService.ts` (currículo), não é o mesmo shape de `Blob`/`File` do navegador, por isso o cast. */
function parteDoArquivo(arquivo: AnexoSelecionado): Blob {
  return {
    uri: arquivo.uri,
    name: arquivo.nome || "anexo",
    type: arquivo.mimeType || "application/octet-stream",
  } as unknown as Blob;
}

/**
 * Única camada que conhece os endpoints reais de Feed
 * (`Site/Backend/src/routes/postagemRoutes.js`/`comentarioRoutes.js`,
 * confirmado por auditoria e, para `criar`/`alternarCurtida`/
 * `criarComentario`, por chamada real ao vivo contra o backend local — Fase
 * 10). Todo path, payload e formato de resposta aqui é literal ao que o
 * backend realmente expõe hoje — nada foi presumido. Nenhum método trata 401
 * por conta própria: o interceptor de `apiClient` já cuida disso para todo o
 * app, igual faz para `AuthService`/`VagasService`.
 */
export const FeedService = {
  /** `GET /postagens` — auth obrigatória. Sem filtros nesta fase (a API aceita mais — `usuarioId`, `escopo=seguindo`, `q` — fica para uma iteração futura, igual `VagasService.listar` deixou filtros de vaga de fora). */
  async listar(parametros: ListarPostagensParametros = {}): Promise<ListaPostagensResposta> {
    const { data } = await apiClient.get<ListaPostagensResposta>("/postagens", { params: parametros });
    return data;
  },

  /** `GET /postagens/:id` — devolve só a publicação, não o envelope. */
  async obterPorId(id: string): Promise<Postagem> {
    const { data } = await apiClient.get<PostagemDetalheResposta>(`/postagens/${id}`);
    return data.postagem;
  },

  /**
   * `POST /postagens`. Sem anexos, continua em JSON puro (confirmado ao vivo
   * na Fase 10 que o `uploadAnexos` da rota é Multer e só atua em
   * requisições multipart — um corpo JSON `{conteudo, publica}` passa
   * direto). Com anexos (Fase 20), vira `multipart/form-data`: cada arquivo
   * em `arquivos` (até 4) + `descricoesAnexos` como `JSON.stringify` de um
   * array de strings, POSICIONALMENTE pareado ao mesmo índice de `arquivos`
   * — contrato literal de `postagemValidator.js`/`PostagemService.create`,
   * nunca um objeto `{indice: descricao}`.
   */
  async criar(dados: CriarPostagemDados): Promise<Postagem> {
    const publica = dados.publica === undefined ? true : dados.publica;

    if (!dados.anexos || dados.anexos.length === 0) {
      const { data } = await apiClient.post<CriarPostagemResposta>("/postagens", {
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

    const { data } = await apiClient.post<CriarPostagemResposta>("/postagens", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.postagem;
  },

  /** `PUT /postagens/:id` — só dono; nunca toca nos anexos (trocar a mídia em si exigiria excluir e recriar a publicação, fora do escopo desta ação). */
  async atualizar(id: string, dados: AtualizarPostagemDados): Promise<Postagem> {
    const { data } = await apiClient.put<CriarPostagemResposta>(`/postagens/${id}`, dados);
    return data.postagem;
  },

  /** `DELETE /postagens/:id` — soft delete (`ativo=false`), só dono (administração é um fluxo do site, fora deste app). */
  async remover(id: string): Promise<{ mensagem: string }> {
    const { data } = await apiClient.delete<RemoverPostagemResposta>(`/postagens/${id}`);
    return { mensagem: data.mensagem };
  },

  /**
   * `PATCH /postagens/:id/anexos/:anexoId` — edita SÓ a descrição acessível
   * de um anexo já publicado (nunca o arquivo em si). `descricao: null`
   * remove a descrição existente (contrato do backend, `validarDescricaoAnexo`).
   */
  async atualizarDescricaoAnexo(postagemId: string, anexoId: string, descricao: string | null): Promise<Postagem> {
    const { data } = await apiClient.patch<AtualizarDescricaoAnexoResposta>(
      `/postagens/${postagemId}/anexos/${anexoId}`,
      { descricao },
    );
    return data.postagem;
  },

  /**
   * `GET /postagens/:id/anexos/:anexoId/url` — SÓ usado como fallback
   * pontual quando a URL já embutida em `postagem.anexos[].url` expira
   * (`Image.onError`, ver `PostagemAnexo` em `types.ts`); nunca no
   * carregamento normal do feed/detalhe, que já vem com URL assinada pronta.
   */
  async obterUrlAnexo(postagemId: string, anexoId: string): Promise<{ url: string; expiraEm: string | null }> {
    const { data } = await apiClient.get<GerarUrlAnexoResposta>(`/postagens/${postagemId}/anexos/${anexoId}/url`);
    return { url: data.url, expiraEm: data.expiraEm };
  },

  /**
   * `POST /postagens/anexos/sugerir-descricao` — stateless (nunca grava
   * nada), campo multipart `"imagem"`, rate-limited no backend
   * (`sugestaoDescricaoLimiter`). Falha (sem IA configurada, limite de taxa,
   * imagem não reconhecida) deve ser tratada pelo chamador como "sugestão
   * indisponível agora", nunca como impedimento para publicar — a descrição
   * continua editável manualmente (mesma regra documentada no backend,
   * `PostagemController.sugerirDescricaoAnexo`).
   */
  async sugerirDescricao(arquivo: AnexoSelecionado): Promise<string> {
    const formData = new FormData();
    formData.append("imagem", parteDoArquivo(arquivo));

    const { data } = await apiClient.post<SugerirDescricaoResposta>("/postagens/anexos/sugerir-descricao", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.descricao;
  },

  /** `POST /postagens/:postagemId/curtidas` — toggle idempotente na mesma rota; devolve o par vindo do servidor, nunca calculado localmente (sem optimistic update, decisão desta fase). */
  async alternarCurtida(postagemId: string): Promise<{ curtido: boolean; totalCurtidas: number }> {
    const { data } = await apiClient.post<AlternarCurtidaResposta>(`/postagens/${postagemId}/curtidas`);
    return { curtido: data.curtido, totalCurtidas: data.totalCurtidas };
  },

  /** `GET /postagens/:postagemId/comentarios` — só comentários de nível raiz; cada um já vem com `respostas` (1 nível) embutidas pelo backend. */
  async listarComentarios(
    postagemId: string,
    parametros: ListarComentariosParametros = {},
  ): Promise<ListaComentariosResposta> {
    const { data } = await apiClient.get<ListaComentariosResposta>(`/postagens/${postagemId}/comentarios`, {
      params: parametros,
    });
    return data;
  },

  /** `POST /postagens/:postagemId/comentarios` — `comentarioPaiId` só ao responder um comentário de nível raiz (1 nível, Fase 10). O backend já valida que o pai existe/está ativo/pertence a esta postagem (404 caso contrário); não replicar essa checagem aqui. */
  async criarComentario(postagemId: string, comentario: string, comentarioPaiId?: string): Promise<Comentario> {
    const { data } = await apiClient.post<CriarComentarioResposta>(`/postagens/${postagemId}/comentarios`, {
      comentario,
      comentarioPaiId,
    });
    return data.comentario;
  },

  /** `DELETE /comentarios/:id` (Fase R6) — só o autor (o backend recusa com 403 caso contrário). Soft delete; o backend emite `feed:comentario` com `removido:true` logo em seguida. Sem pré-checagem de posse aqui: a tela só oferece a ação nos comentários do próprio usuário, e o backend é a autoridade final. */
  async removerComentario(comentarioId: string): Promise<{ mensagem: string }> {
    const { data } = await apiClient.delete<RemoverComentarioResposta>(`/comentarios/${comentarioId}`);
    return { mensagem: data.mensagem };
  },
};
