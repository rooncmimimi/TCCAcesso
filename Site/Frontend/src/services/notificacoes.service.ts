import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { Notificacao, PreferenciasNotificacao } from "@/types";

/** Notificações do usuário autenticado. */
export const notificacoesService = {
  async listar(params: { page?: number; limit?: number } = {}): Promise<Paginado<Notificacao>> {
    return buscarPaginado<Notificacao>("/notificacoes", "notificacoes", params);
  },

  async contarNaoLidas(): Promise<number> {
    const { data } = await api.get<{ total?: number; naoLidas?: number }>("/notificacoes/nao-lidas");
    return Number(data.total ?? data.naoLidas ?? 0);
  },

  async marcarComoLida(id: string): Promise<void> {
    await api.patch(`/notificacoes/${id}/lida`);
  },

  async marcarTodas(): Promise<void> {
    await api.patch("/notificacoes/lidas");
  },

  async remover(id: string): Promise<void> {
    await api.delete(`/notificacoes/${id}`);
  },

  async obterPreferencias(): Promise<PreferenciasNotificacao> {
    const { data } = await api.get<{ preferencias: PreferenciasNotificacao }>("/notificacoes/preferencias");
    return data.preferencias;
  },

  async atualizarPreferencias(payload: Partial<PreferenciasNotificacao>): Promise<PreferenciasNotificacao> {
    const { data } = await api.put<{ preferencias: PreferenciasNotificacao }>(
      "/notificacoes/preferencias",
      payload,
    );
    return data.preferencias;
  },
};

export default notificacoesService;
