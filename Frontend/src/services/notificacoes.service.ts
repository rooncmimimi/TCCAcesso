import api from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { Notificacao } from "@/types";

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
};

export default notificacoesService;
