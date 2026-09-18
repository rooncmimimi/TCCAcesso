/**
 * Tipos das configurações de privacidade (`BloqueioController` no backend) e de notificações
 * (`NotificacaoController`).
 */

/** `PUT /usuarios/privacidade`. Em perfil privado, seguir vira uma solicitação. */
export interface AtualizarPrivacidadeResposta {
  sucesso: true;
  perfilPublico: boolean;
}

export type PreferenciaMensagens = "todos" | "seguidores" | "seguindo" | "mutuo" | "empresas" | "ninguem";

/** `PUT /usuarios/privacidade/mensagens`: quem pode iniciar uma conversa com o usuário. */
export interface AtualizarPreferenciaMensagensResposta {
  sucesso: true;
  preferenciaMensagens: PreferenciaMensagens;
}

/** `GET/PUT /notificacoes/preferencias`: 4 categorias, todas booleanas, todas `true` por padrão (`findOrCreate`). */
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

/** Só os 4 campos que `PUT /notificacoes/preferencias` de fato aceita (todos opcionais: envia só o que mudou). */
export interface PreferenciasNotificacaoDados {
  vagasCandidaturas?: boolean;
  mensagens?: boolean;
  publicacoesComentarios?: boolean;
  redeSeguidores?: boolean;
}
