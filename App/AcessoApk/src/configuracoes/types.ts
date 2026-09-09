/**
 * Tipos de configurações de privacidade e notificação (Fase 15), conforme
 * auditoria de `usuarioRoutes.js` (`BloqueioController`) e
 * `notificacaoRoutes.js` (`NotificacaoController`).
 */

/** `PUT /usuarios/privacidade` — controla se `POST /seguir/usuarios/:id` segue direto ou exige solicitação (Fase 14). */
export interface AtualizarPrivacidadeResposta {
  sucesso: true;
  perfilPublico: boolean;
}

export type PreferenciaMensagens = "todos" | "seguidores" | "seguindo" | "mutuo" | "empresas" | "ninguem";

/** `PUT /usuarios/privacidade/mensagens` — quem pode iniciar uma conversa com o usuário (usado pela Fase 17). */
export interface AtualizarPreferenciaMensagensResposta {
  sucesso: true;
  preferenciaMensagens: PreferenciaMensagens;
}

/** `GET/PUT /notificacoes/preferencias` — 4 categorias, todas booleanas, todas `true` por padrão (`findOrCreate`). */
export interface PreferenciasNotificacao {
  id: string;
  usuarioId: string;
  vagasCandidaturas: boolean;
  mensagens: boolean;
  publicacoesComentarios: boolean;
  redeSeguidores: boolean;
  [chave: string]: unknown;
}

export interface PreferenciasNotificacaoResposta {
  sucesso: true;
  preferencias: PreferenciasNotificacao;
}

/** Só os 4 campos que `PUT /notificacoes/preferencias` de fato aceita (todos opcionais — envia só o que mudou). */
export interface PreferenciasNotificacaoDados {
  vagasCandidaturas?: boolean;
  mensagens?: boolean;
  publicacoesComentarios?: boolean;
  redeSeguidores?: boolean;
}
