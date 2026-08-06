import api from "./api";
import type { ChatbotMensagem, PreferenciasAcessibilidade } from "@/types";

/** Preferências de acessibilidade persistidas na conta do usuário. */
export const acessibilidadeService = {
  async obter(): Promise<PreferenciasAcessibilidade> {
    const { data } = await api.get<{ preferencias: PreferenciasAcessibilidade }>("/acessibilidade");
    return data.preferencias ?? {};
  },

  async salvar(payload: PreferenciasAcessibilidade): Promise<PreferenciasAcessibilidade> {
    const { data } = await api.put<{ preferencias: PreferenciasAcessibilidade }>(
      "/acessibilidade",
      payload,
    );
    return data.preferencias ?? {};
  },

  async restaurar(): Promise<PreferenciasAcessibilidade> {
    const { data } = await api.post<{ preferencias: PreferenciasAcessibilidade }>(
      "/acessibilidade/reset",
    );
    return data.preferencias ?? {};
  },
};

/** Assistente virtual (chatbot) com conversas persistidas. */
export const chatbotService = {
  async conversas() {
    const { data } = await api.get<{ conversas: { id: string; titulo?: string }[] }>(
      "/chatbot/conversas",
    );
    return data.conversas ?? [];
  },

  async mensagens(conversaId: string): Promise<ChatbotMensagem[]> {
    const { data } = await api.get<{ mensagens: ChatbotMensagem[] }>(
      `/chatbot/conversas/${conversaId}/mensagens`,
    );
    return data.mensagens ?? [];
  },

  async enviar(conteudo: string, conversaId?: string | null) {
    const { data } = await api.post<{
      conversaId: string;
      resposta: ChatbotMensagem;
      mensagem?: ChatbotMensagem;
    }>("/chatbot/mensagens", { conteudo, conversaId: conversaId ?? null });
    return data;
  },

  async remover(conversaId: string): Promise<void> {
    await api.delete(`/chatbot/conversas/${conversaId}`);
  },
};

export default acessibilidadeService;
