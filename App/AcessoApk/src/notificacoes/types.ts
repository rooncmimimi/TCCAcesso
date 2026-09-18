/**
 * Tipos de notificações.
 *
 * `entidadeTipo`, `entidadeId` e `atorId` podem vir `null` (notificação sem alvo, ou gravada antes
 * de esses campos existirem); nesse caso a tela mostra só `titulo` e `descricao`, sem link nem
 * avatar.
 *
 * O backend usa `entidadeTipo` com os valores `usuario`, `postagem`, `vaga`,
 * `solicitacao_seguimento`, `conversa`, `comentario`, `empresa` e `denuncia`. A tela abre o
 * conteúdo nos quatro primeiros; nos demais, tocar só marca como lida.
 */

export type TipoNotificacao = "sistema" | "mensagem" | "vaga" | "candidatura" | "feed" | "moderacao";

/** Quem praticou a ação (curtiu, comentou, seguiu, solicitou seguir...): sempre id/nome/foto, nunca dado privado (mesma allowlist do backend). `null` quando a notificação não tem ator (avisos do sistema). */
export interface AtorNotificacao {
  id: string;
  nome: string;
  fotoPerfil: string | null;
}

/** Serialização padrão do Sequelize para o model `Notificacao`: `criadoEm`/`atualizadoEm` são os nomes reais do atributo (o model renomeia explicitamente, não é só a coluna do banco). */
export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  descricao: string | null;
  lida: boolean;
  subtipo: string | null;
  entidadeTipo: string | null;
  entidadeId: string | null;
  atorId: string | null;
  ator: AtorNotificacao | null;
  criadoEm: string;
  atualizadoEm: string;
  [chave: string]: unknown;
}

export interface ListarNotificacoesParametros {
  page?: number;
  limit?: number;
}

/** `GET /notificacoes`: mesmo envelope de paginação de `/postagens`/`/vagas` (`montarResposta`). */
export interface ListaNotificacoesResposta {
  sucesso: true;
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  notificacoes: Notificacao[];
}

/** `GET /notificacoes/nao-lidas`. */
export interface NaoLidasResposta {
  sucesso: true;
  naoLidas: number;
}

/** `PATCH /notificacoes/:id/lida`. */
export interface MarcarComoLidaResposta {
  sucesso: true;
  notificacao: Notificacao;
}

/** Plataformas aceitas por `POST /notificacoes/push-token` (o backend valida com `isIn(["android", "ios"])`). */
export type PlataformaPush = "android" | "ios";

/** `POST /notificacoes/push-token`: 200 em sucesso. */
export interface RegistrarPushTokenResposta {
  sucesso: true;
  registrado: true;
}

/** `DELETE /notificacoes/push-token`: 200 em sucesso; idempotente. */
export interface RemoverPushTokenResposta {
  sucesso: true;
  removido: true;
}
