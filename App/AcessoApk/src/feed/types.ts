/**
 * Tipos do feed: publicações, anexos e comentários, com os nomes de campo que a API envia
 * (`models/Postagem.js`, `models/Comentario.js`).
 */

/**
 * Autor embutido em publicações e comentários. Só os campos usados pelo app têm nome; o restante
 * fica no índice.
 */
export interface AutorResumo {
  id: string;
  nome: string;
  fotoPerfil?: string | null;
  tipoUsuario?: string;
  [chave: string]: unknown;
}

/**
 * `models/PostagemAnexo.js`. A `url` já chega assinada pelo backend; `FeedService.obterUrlAnexo` só
 * entra em cena quando essa URL expira.
 *
 * `descricao` é o texto alternativo da mídia, lido pelo leitor de tela. Nunca é gerada sem revisão:
 * a sugestão da IA é um rascunho que a pessoa edita ou confirma.
 */
export interface PostagemAnexo {
  id: string;
  postagemId: string;
  tipo: "imagem" | "video" | "documento";
  url: string;
  nomeOriginal?: string | null;
  descricao?: string | null;
  tipoMime?: string | null;
  tamanhoBytes?: number | null;
  ordem: number;
  [chave: string]: unknown;
}

/**
 * Só os campos usados pelo app têm nome; o restante (compartilhamentos etc.) continua acessível
 * pelo índice.
 *
 * O autor chega em `usuario`, mas o contrato também prevê `autor`; leia sempre
 * `postagem.usuario ?? postagem.autor`.
 */
export interface Postagem {
  id: string;
  conteudo: string | null;
  publica: boolean;
  editadoEm?: string | null;
  criadoEm: string;
  usuario?: AutorResumo;
  autor?: AutorResumo;
  totalCurtidas: number;
  curtidoPorMim: boolean;
  totalComentarios: number;
  /** Só presente em `GET /postagens`/`GET /postagens/:id` (`incluirAnexos()` no backend); até 4, na ordem de `ordem`. */
  anexos?: PostagemAnexo[];
  [chave: string]: unknown;
}

/**
 * `respostas` só vem nos comentários raiz de `GET /postagens/:postagemId/comentarios`, com as
 * respostas (um nível) já embutidas pelo backend.
 */
export interface Comentario {
  id: string;
  comentario: string;
  comentarioPaiId?: string | null;
  editadoEm?: string | null;
  criadoEm: string;
  usuario?: AutorResumo;
  autor?: AutorResumo;
  respostas?: Comentario[];
  [chave: string]: unknown;
}

/** `GET /postagens`: paginação incremental para a rolagem infinita do feed (ver `FeedScreen.tsx`). */
export interface ListaPostagensResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  postagens: Postagem[];
}

/** `GET /postagens/:id`. */
export interface PostagemDetalheResposta {
  sucesso: true;
  postagem: Postagem;
}

/** `POST /postagens`: 201 em sucesso. */
export interface CriarPostagemResposta {
  sucesso: true;
  postagem: Postagem;
}

/**
 * `POST /postagens/:postagemId/curtidas`: a mesma rota curte e descurte. O resultado do servidor é
 * sempre o que vale, sem atualização otimista, no mesmo padrão do favoritar de vagas.
 */
export interface AlternarCurtidaResposta {
  sucesso: true;
  curtido: boolean;
  totalCurtidas: number;
}

/** `GET /postagens/:postagemId/comentarios`. */
export interface ListaComentariosResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  comentarios: Comentario[];
}

/** `POST /postagens/:postagemId/comentarios`: 201 em sucesso. */
export interface CriarComentarioResposta {
  sucesso: true;
  comentario: Comentario;
}

/**
 * `DELETE /comentarios/:id`: exclusão lógica (`ativo=false`) pelo autor ou por administrador (403
 * para os demais, 404 se já removido). Emite `feed:comentario` com `removido: true`, evento que a
 * tela de detalhe já trata.
 */
export interface RemoverComentarioResposta {
  sucesso: true;
  mensagem: string;
}

export interface ListarPostagensParametros {
  page?: number;
  limit?: number;
}

export interface ListarComentariosParametros {
  page?: number;
  limit?: number;
}

/** Imagem escolhida no `expo-image-picker`, reduzida aos campos que o app envia no upload. */
export interface AnexoSelecionado {
  uri: string;
  nome: string | null;
  mimeType: string | null;
  tamanhoBytes: number | null;
}

/**
 * Anexo pronto para publicar: o arquivo e a descrição que a pessoa escreveu ou aceitou da sugestão
 * da IA. A descrição sempre passa pela revisão dela, mesmo quando fica vazia.
 */
export interface AnexoParaPublicar {
  arquivo: AnexoSelecionado;
  descricao: string;
}

/**
 * Corpo de `POST /postagens` e `PUT /postagens/:id`, declarado campo a campo: um `Omit` sobre
 * `Postagem`, que tem o índice `[chave: string]`, perderia a tipagem dos campos.
 */
export interface CriarPostagemDados {
  conteudo?: string;
  publica?: boolean;
  /** Até 4 imagens (limite do backend). O app ainda não anexa vídeos. */
  anexos?: AnexoParaPublicar[];
}

export interface AtualizarPostagemDados {
  conteudo?: string;
  publica?: boolean;
}

/** `PATCH /postagens/:id/anexos/:anexoId`: devolve a publicação inteira já atualizada (mesmo formato de `PostagemDetalheResposta`), nunca só o anexo isolado. */
export interface AtualizarDescricaoAnexoResposta {
  sucesso: true;
  postagem: Postagem;
}

/** `DELETE /postagens/:id`: soft delete (`ativo=false`), dono ou admin. */
export interface RemoverPostagemResposta {
  sucesso: true;
  mensagem: string;
}

/**
 * `GET /postagens/:id/anexos/:anexoId/url` (exibição) e `.../download`. `expiraEm` só é `null` em
 * anexos antigos não privados, sem prazo. No app, serve apenas para renovar uma URL expirada (ver
 * `PostagemAnexo`).
 */
export interface GerarUrlAnexoResposta {
  sucesso: true;
  url: string;
  expiraEm: string | null;
}

/**
 * `POST /postagens/anexos/sugerir-descricao`: não grava nada. Qualquer falha (OpenRouter não
 * configurado, limite de requisições, imagem não reconhecida) só significa que a sugestão está
 * indisponível; publicar continua possível.
 */
export interface SugerirDescricaoResposta {
  sucesso: true;
  descricao: string;
}

/**
 * Eventos de Socket.IO do feed (`emitirFeed` em `realtime/socket.js`). Vão para todos os clientes
 * conectados, sem sala, e por isso carregam só ids e marcadores, nunca a publicação nem URLs de
 * mídia. Ao receber, a tela busca o conteúdo pela API, que aplica as regras de acesso.
 *
 * As contagens (`totalCurtidas`, `totalComentarios`) são a exceção: números que não revelam nada
 * além do que a pessoa já vê, aplicados direto, sem nova requisição.
 */
export interface FeedPostagemEvento {
  id: string;
  criada?: true;
  atualizada?: true;
  removida?: true;
}

export interface FeedCurtidaEvento {
  postagemId: string;
  totalCurtidas: number;
}

export interface FeedComentarioEvento {
  postagemId: string;
  totalComentarios: number;
  /**
   * Só vem na remoção. A criação informa apenas a nova contagem, sem dizer qual comentário surgiu,
   * por isso um comentário novo recarrega a lista.
   */
  comentarioId?: string;
  removido?: true;
}
