import { clienteApi } from "../services/api/cliente";
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

/** Notificações da conta e registro do token de push deste aparelho. */
export const NotificacaoService = {
  /** `GET /notificacoes`: paginado, mais recentes primeiro. */
  async listar(parametros: ListarNotificacoesParametros = {}): Promise<ListaNotificacoesResposta> {
    const { data } = await clienteApi.get<ListaNotificacoesResposta>("/notificacoes", { params: parametros });
    return data;
  },

  /** `GET /notificacoes/nao-lidas`: usado pelo selo (badge) da aba. */
  async contarNaoLidas(): Promise<number> {
    const { data } = await clienteApi.get<NaoLidasResposta>("/notificacoes/nao-lidas");
    return data.naoLidas;
  },

  /** `PATCH /notificacoes/:id/lida`. */
  async marcarComoLida(id: string): Promise<Notificacao> {
    const { data } = await clienteApi.patch<MarcarComoLidaResposta>(`/notificacoes/${id}/lida`);
    return data.notificacao;
  },

  /** `PATCH /notificacoes/lidas`: marca todas as não lidas do usuário de uma vez. */
  async marcarTodasComoLidas(): Promise<void> {
    await clienteApi.patch("/notificacoes/lidas");
  },

  /** `DELETE /notificacoes/:id`. */
  async remover(id: string): Promise<void> {
    await clienteApi.delete(`/notificacoes/${id}`);
  },

  /** `POST /notificacoes/push-token`: registra ou atualiza o Expo push token deste aparelho. */
  async registrarPushToken(token: string, plataforma: PlataformaPush): Promise<void> {
    await clienteApi.post<RegistrarPushTokenResposta>("/notificacoes/push-token", { token, plataforma });
  },

  /** `DELETE /notificacoes/push-token`: remove o token ao sair da conta. Idempotente no backend. */
  async removerPushToken(token: string): Promise<void> {
    await clienteApi.delete<RemoverPushTokenResposta>("/notificacoes/push-token", { data: { token } });
  },
};
