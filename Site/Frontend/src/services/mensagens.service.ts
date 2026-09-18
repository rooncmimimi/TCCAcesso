import clienteApi from "./api";
import { buscarPaginado, type Paginado } from "./http";
import type { Conversa, Mensagem, PodeIniciarConversa } from "@/types";

/** Conversas e mensagens do chat (REST; o Socket.IO apenas complementa). */
export const mensagensService = {
  async listarConversas(params: { page?: number; limit?: number } = {}): Promise<Paginado<Conversa>> {
    return buscarPaginado<Conversa>("/conversas", "conversas", params);
  },

  async detalharConversa(id: string): Promise<Conversa> {
    const { data } = await clienteApi.get<{ conversa: Conversa }>(`/conversas/${id}`);
    return data.conversa;
  },

  async criarConversa(payload: Record<string, unknown>): Promise<Conversa> {
    const { data } = await clienteApi.post<{ conversa: Conversa }>("/conversas", payload);
    return data.conversa;
  },

  async listarMensagens(
    conversaId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<Paginado<Mensagem>> {
    return buscarPaginado<Mensagem>(`/conversas/${conversaId}/mensagens`, "mensagens", params);
  },

  async enviar(conversaId: string, conteudo: string): Promise<Mensagem> {
    const { data } = await clienteApi.post<{ mensagem: Mensagem }>(`/conversas/${conversaId}/mensagens`, {
      conteudo,
    });
    return data.mensagem;
  },

  async marcarComoLidas(conversaId: string): Promise<void> {
    await clienteApi.patch(`/conversas/${conversaId}/mensagens/lidas`);
  },

  async contarNaoLidas(): Promise<number> {
    const { data } = await clienteApi.get<{ naoLidas?: number }>("/conversas/nao-lidas");
    return Number(data.naoLidas ?? 0);
  },

  /**
   * Consulta, sem lançar erro de permissão, se o usuário pode iniciar uma conversa com `usuarioId`;
   * decide o estado do botão "Enviar mensagem" antes do clique.
   */
  async podeIniciarConversa(usuarioId: string): Promise<PodeIniciarConversa> {
    const { data } = await clienteApi.get<PodeIniciarConversa>(`/conversas/pode-iniciar/${usuarioId}`);
    return { permitido: Boolean(data.permitido), motivo: data.motivo };
  },
};

export default mensagensService;
