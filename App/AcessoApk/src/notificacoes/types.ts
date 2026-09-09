/**
 * Tipos do contrato real de notificações (Site/Backend), conforme auditoria
 * da Fase 16 — `notificacaoRoutes.js`, `NotificacaoController`,
 * `NotificacaoService`, model `Notificacao`. Nomes de campo em português são
 * literais ao que a API envia.
 *
 * IMPORTANTE (achado da auditoria): `entidadeTipo`/`entidadeId`/`atorId` só
 * existem a partir da migration 0033 — uma notificação antiga não tem esses
 * campos (`null`), e a tela precisa continuar mostrando o texto congelado em
 * `titulo`/`descricao` normalmente, só sem link/avatar. Os valores reais de
 * `entidadeTipo` observados no backend (`grep` em todo `NotificacaoService
 * .criar(...)`): `"usuario"`, `"postagem"`, `"vaga"`, `"solicitacao_seguimento"`,
 * `"conversa"`, `"empresa"`, `"denuncia"` — só os 4 primeiros têm uma tela
 * correspondente neste app hoje (`PublicProfile`, `PostagemDetail`,
 * `VagaDetail`, e o caso especial de aceitar/recusar solicitação); os
 * demais (conversa — Fase 17 ainda não existe; empresa/denúncia — não há
 * tela de terceiros para eles neste app) só marcam como lida ao tocar, sem
 * navegar para lugar nenhum inventado.
 */

export type TipoNotificacao = "Sistema" | "Mensagem" | "Vaga" | "Candidatura" | "Feed" | "Moderacao";

/** Quem praticou a ação (curtiu, comentou, seguiu, solicitou seguir...) — sempre id/nome/foto, nunca dado privado (mesma allowlist do backend). `null` quando a notificação não tem ator (avisos do sistema). */
export interface AtorNotificacao {
  id: string;
  nome: string;
  fotoPerfil: string | null;
}

/** Serialização padrão do Sequelize para o model `Notificacao` — `created_at`/`updated_at` são os nomes REAIS do atributo (o model renomeia explicitamente, não é só a coluna do banco). */
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
  created_at: string;
  updated_at: string;
  [chave: string]: unknown;
}

export interface ListarNotificacoesParametros {
  page?: number;
  limit?: number;
}

/** `GET /notificacoes` — mesmo envelope de paginação de `/postagens`/`/vagas` (`montarResposta`). */
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
