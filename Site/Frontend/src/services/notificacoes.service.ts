import clienteApi from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { Notificacao, PreferenciasNotificacao } from "@/types";

/** Notificações do usuário autenticado. */
export const notificacoesService = {
  async listar(params: { page?: number; limit?: number } = {}): Promise<Paginado<Notificacao>> {
    return buscarPaginado<Notificacao>("/notificacoes", "notificacoes", params);
  },

  async contarNaoLidas(): Promise<number> {
    const { data } = await clienteApi.get<{ total?: number; naoLidas?: number }>("/notificacoes/nao-lidas");
    return Number(data.total ?? data.naoLidas ?? 0);
  },

  async marcarComoLida(id: string): Promise<void> {
    await clienteApi.patch(`/notificacoes/${id}/lida`);
  },

  async marcarTodas(): Promise<void> {
    await clienteApi.patch("/notificacoes/lidas");
  },

  async remover(id: string): Promise<void> {
    await clienteApi.delete(`/notificacoes/${id}`);
  },

  async obterPreferencias(): Promise<PreferenciasNotificacao> {
    const { data } = await clienteApi.get<{ preferencias: PreferenciasNotificacao }>("/notificacoes/preferencias");
    return data.preferencias;
  },

  async atualizarPreferencias(payload: Partial<PreferenciasNotificacao>): Promise<PreferenciasNotificacao> {
    const { data } = await clienteApi.put<{ preferencias: PreferenciasNotificacao }>(
      "/notificacoes/preferencias",
      payload,
    );
    return data.preferencias;
  },
};

export default notificacoesService;
