import { apiClient } from "../services/api/client";
import type {
  ListaNotificacoesResposta,
  ListarNotificacoesParametros,
  MarcarComoLidaResposta,
  NaoLidasResposta,
  Notificacao,
  PlataformaPush,
  RegistrarPushTokenResposta,
  RemoverPushTokenResposta,
} from "./types";

/**
 * Única camada que conhece os endpoints reais de notificações
 * (`Site/Backend/src/routes/notificacaoRoutes.js`, confirmado por
 * auditoria). Todo path/payload/resposta é literal ao que o backend expõe
 * hoje. Nenhum método trata 401 por conta própria (interceptor do
 * `apiClient` já cuida disso, mesma regra do resto do app).
 */
export const NotificacaoService = {
  /** `GET /notificacoes` — paginado, mais recentes primeiro. */
  async listar(parametros: ListarNotificacoesParametros = {}): Promise<ListaNotificacoesResposta> {
    const { data } = await apiClient.get<ListaNotificacoesResposta>("/notificacoes", { params: parametros });
    return data;
  },

  /** `GET /notificacoes/nao-lidas` — usado pelo selo (badge) da aba. */
  async contarNaoLidas(): Promise<number> {
    const { data } = await apiClient.get<NaoLidasResposta>("/notificacoes/nao-lidas");
    return data.naoLidas;
  },

  /** `PATCH /notificacoes/:id/lida`. */
  async marcarComoLida(id: string): Promise<Notificacao> {
    const { data } = await apiClient.patch<MarcarComoLidaResposta>(`/notificacoes/${id}/lida`);
    return data.notificacao;
  },

  /** `PATCH /notificacoes/lidas` — marca TODAS as não lidas do usuário de uma vez. */
  async marcarTodasComoLidas(): Promise<void> {
    await apiClient.patch("/notificacoes/lidas");
  },

  /** `DELETE /notificacoes/:id`. */
  async remover(id: string): Promise<void> {
    await apiClient.delete(`/notificacoes/${id}`);
  },

  /** `POST /notificacoes/push-token` (Fase R5) — registra/reaponta o Expo push token deste dispositivo. */
  async registrarPushToken(token: string, plataforma: PlataformaPush): Promise<void> {
    await apiClient.post<RegistrarPushTokenResposta>("/notificacoes/push-token", { token, plataforma });
  },

  /** `DELETE /notificacoes/push-token` (Fase R5) — remove o token no logout. Idempotente no backend. */
  async removerPushToken(token: string): Promise<void> {
    await apiClient.delete<RemoverPushTokenResposta>("/notificacoes/push-token", { data: { token } });
  },
};
