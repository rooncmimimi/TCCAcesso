/**
 * Tipos do contrato real de Feed do backend (Site/Backend), conforme
 * auditoria da Fase 10. Nomes de campo em português são LITERAIS ao que a
 * API envia (`models/Postagem.js`, `models/Comentario.js`,
 * `PostagemService.js`, `ComentarioService.js`) — não são estilo, são o
 * contrato.
 *
 * `POST /postagens` tem o middleware Multer `uploadAnexos.array("arquivos",
 * 4)` montado na rota, mas confirmado AO VIVO (Fase 10, contra o backend
 * local) que um corpo JSON puro (sem multipart) com `{conteudo, publica}`
 * passa direto — Multer só intercepta requisições multipart, então
 * `express.json()` preenche `req.body` normalmente quando não há arquivo
 * nenhum. Por isso `FeedService.criar` nesta fase nunca usa `FormData`.
 */

/** O objeto `usuario` embutido em `Postagem`/`Comentario` — só os campos que
 * esta fase usa (mesmo índice de campos não mapeados que `EmpresaResumoVaga`
 * já tem em `src/vagas/types.ts`, mesmo motivo). */
export interface AutorResumo {
  id: string;
  nome: string;
  /** Sem componente de imagem nesta fase (Fase 10) — o avatar é sempre um
   * círculo com as iniciais de `nome`, mesmo quando `fotoPerfil` existe. */
  fotoPerfil?: string | null;
  tipoUsuario?: string;
  [chave: string]: unknown;
}

/**
 * `Site/Backend/src/models/PostagemAnexo.js`. `url` já chega PRONTA para uso
 * (`PostagemService.decorar` → `assinarMidiaDasPostagens` assina a URL antes
 * de a resposta sair do backend) — diferente do currículo/logo (Fase
 * 13/18), este app NÃO precisa buscar uma URL separada para exibir a mídia
 * do feed; só usa `FeedService.obterUrlAnexo` como fallback pontual quando a
 * URL assinada expira (`Image.onError`), nunca no carregamento normal.
 *
 * `descricao` é o texto alternativo real da imagem/vídeo, lido pelo sistema
 * de voz do dispositivo — "usada como `alt` real da imagem", conforme o
 * próprio comentário do model no backend. Nunca gerada automaticamente sem
 * revisão do usuário (a sugestão por IA é sempre um rascunho editável, nunca
 * publicada sem confirmação).
 */
export interface PostagemAnexo {
  id: string;
  postagemId: string;
  tipo: "imagem" | "video" | "documento";
  url: string;
  privado: boolean;
  nomeOriginal?: string | null;
  descricao?: string | null;
  mimeType?: string | null;
  tamanhoBytes?: number | null;
  ordem: number;
  [chave: string]: unknown;
}

/**
 * Tipado só com os campos que esta fase usa — o backend envia mais campos
 * (compartilhamentos etc.), e eles continuam disponíveis em tempo de
 * execução (índice `[chave: string]`), só não são nomeados aqui até uma tela
 * futura precisar deles.
 *
 * `usuario`/`autor` coexistem no contrato real (confirmado pela auditoria do
 * site, ainda que o backend hoje só tenha sido observado enviando
 * `usuario`) — toda leitura do autor deve usar `postagem.usuario ??
 * postagem.autor`, nunca só um dos dois campos.
 */
export interface Postagem {
  id: string;
  conteudo: string | null;
  imagem?: string | null;
  publica: boolean;
  editadoEm?: string | null;
  created_at: string;
  usuario?: AutorResumo;
  autor?: AutorResumo;
  totalCurtidas: number;
  curtidoPorMim: boolean;
  totalComentarios: number;
  /** Só presente em `GET /postagens`/`GET /postagens/:id` (`incluirAnexos()` no backend) — até 4, na ordem de `ordem`. */
  anexos?: PostagemAnexo[];
  [chave: string]: unknown;
}

/**
 * Tipado só com os campos que esta fase usa. `respostas` só aparece nos
 * comentários de nível raiz devolvidos por `GET
 * /postagens/:postagemId/comentarios` (o backend já filtra
 * `comentarioPaiId: null` nesse endpoint e embute as respostas de 1 nível
 * junto — nunca vêm comentários de nível raiz dentro de `respostas`).
 */
export interface Comentario {
  id: string;
  comentario: string;
  comentarioPaiId?: string | null;
  editadoEm?: string | null;
  created_at: string;
  usuario?: AutorResumo;
  autor?: AutorResumo;
  respostas?: Comentario[];
  [chave: string]: unknown;
}

/** `GET /postagens` — paginação incremental (scroll infinito), não clássica (diferente de Vagas, de propósito — ver `HomeScreen.tsx`). */
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

/** `POST /postagens` — 201 em sucesso. */
export interface CriarPostagemResposta {
  sucesso: true;
  postagem: Postagem;
}

/** `POST /postagens/:postagemId/curtidas` — toggle idempotente na MESMA rota (sem DELETE separado). Sempre a fonte de verdade: sem optimistic update nesta fase (decisão do usuário, por consistência com o padrão de favoritar de Vagas). */
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

/** `POST /postagens/:postagemId/comentarios` — 201 em sucesso. */
export interface CriarComentarioResposta {
  sucesso: true;
  comentario: Comentario;
}

export interface ListarPostagensParametros {
  page?: number;
  limit?: number;
}

export interface ListarComentariosParametros {
  page?: number;
  limit?: number;
}

/**
 * Formato que `expo-image-picker` devolve em `result.assets[0]` (Expo SDK
 * 57, confirmado na documentação versionada antes de escrever este código —
 * ver `AGENTS.md`), tipado só com os campos que `FeedService`/
 * `NovaPostagemScreen` usam. `fileSize` é usado para o mesmo tipo de
 * checagem de tamanho que o backend aplica (`uploadMiddleware.js`), para dar
 * um erro amigável ANTES de tentar o upload, não só depois de um 400.
 */
export interface AnexoSelecionado {
  uri: string;
  nome: string | null;
  mimeType: string | null;
  tamanhoBytes: number | null;
}

/** Um anexo pronto para publicar: o arquivo escolhido + a descrição acessível que o usuário escreveu (ou aceitou da sugestão por IA) para ele. Nunca publicado sem essa descrição ter passado pela revisão do usuário — mesmo vazia, é uma escolha explícita, nunca gerada automaticamente sem tela. */
export interface AnexoParaPublicar {
  arquivo: AnexoSelecionado;
  descricao: string;
}

/**
 * Payload de `POST /postagens`/`PUT /postagens/:id` — interface EXPLÍCITA,
 * não `Omit<Postagem, ...>` (mesmo motivo já documentado em
 * `src/vagas/types.ts`/`src/perfil/types.ts`: `Postagem` tem `[chave:
 * string]: unknown`, e `Omit`/`Pick` sobre um tipo com índice de string
 * colapsam `keyof` para `string`, perdendo a tipagem real dos campos).
 */
export interface CriarPostagemDados {
  conteudo?: string;
  publica?: boolean;
  /** Até 4 (limite do backend, `uploadAnexos.array("arquivos", 4)`) — só imagem nesta fase (ver `NovaPostagemScreen.tsx`: anexar vídeo fica para uma fase futura, sem player de vídeo no app ainda). */
  anexos?: AnexoParaPublicar[];
}

export interface AtualizarPostagemDados {
  conteudo?: string;
  publica?: boolean;
}

/** `PATCH /postagens/:id/anexos/:anexoId` — devolve a publicação inteira já atualizada (mesmo formato de `PostagemDetalheResposta`), nunca só o anexo isolado. */
export interface AtualizarDescricaoAnexoResposta {
  sucesso: true;
  postagem: Postagem;
}

/** `DELETE /postagens/:id` — soft delete (`ativo=false`), dono ou admin. */
export interface RemoverPostagemResposta {
  sucesso: true;
  mensagem: string;
}

/** `GET /postagens/:id/anexos/:anexoId/url` (exibição) e `.../download` (força download) — mesmo formato, `expiraEm` é `null` só no caso legado (anexo não-privado, sem TTL). Usado nesta fase só como fallback pontual quando a URL já embutida na publicação expira (`Image.onError`), nunca no carregamento normal (ver `PostagemAnexo.url` acima). */
export interface GerarUrlAnexoResposta {
  sucesso: true;
  url: string;
  expiraEm: string | null;
}

/** `POST /postagens/anexos/sugerir-descricao` — stateless, nunca grava nada; falha (sem OpenRouter configurado, limite de taxa, imagem não reconhecida) é sempre "sugestão indisponível agora", nunca um impedimento para publicar (mesma regra documentada no backend, `PostagemController.sugerirDescricaoAnexo`). */
export interface SugerirDescricaoResposta {
  sucesso: true;
  descricao: string;
}

/**
 * Payloads dos eventos de Socket.IO do Feed (`Site/Backend/src/realtime/
 * socket.js` → `emitirFeed`, usado por `PostagemService`). Emissão GLOBAL
 * (`io.emit`, sem sala) e SEMPRE `{id, <flag>}` — nunca o objeto de domínio
 * completo nem uma URL assinada (comentário de segurança explícito no
 * backend: o payload contornaria toda autorização de `garantirAcessoAPostagem`
 * se carregasse dado de verdade). O cliente NUNCA confia no payload além do
 * que está tipado aqui — sempre revalida via REST antes de mostrar qualquer
 * conteúdo nascido de um destes eventos (ver `HomeScreen.tsx`/
 * `PostagemDetailScreen.tsx`). As contagens (`totalCurtidas`/
 * `totalComentarios`) são a única exceção: são números não-sensíveis (não
 * revelam nada que a autorização já não tenha permitido só por o cliente ter
 * a postagem carregada), por isso são aplicados diretamente, sem um round-trip
 * REST extra — é o que torna a "curtida"/contagem de comentários de verdade
 * em tempo real.
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
  /** Só presente quando um comentário foi removido — nunca vem no evento de comentário CRIADO (o payload de criação não identifica qual comentário nasceu, só que a contagem mudou; por isso uma criação remota vira um refetch da lista inteira, não uma inserção pontual). */
  comentarioId?: string;
  removido?: true;
}
