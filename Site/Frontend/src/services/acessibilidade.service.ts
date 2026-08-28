import api from "./api";
import type { ChatbotConversa, ChatbotMensagem, PreferenciasAcessibilidade } from "@/types";
import type { AccessibilityPrefs } from "@/contexts/AccessibilityContext";

/** Converte as preferências locais para o formato aceito pelo Backend. */
export function prefsParaApi(prefs: AccessibilityPrefs): PreferenciasAcessibilidade {
  return {
    tema: prefs.darkMode ? "escuro" : "claro",
    altoContraste: prefs.highContrast,
    fonteDislexia: prefs.dyslexiaFont,
    escalaFonte: Math.min(200, Math.max(80, Math.round(prefs.fontScale * 100))),
    espacamentoTexto: prefs.letterSpacing > 0 || prefs.lineHeight > 1.6,
    reduzirAnimacoes: prefs.reduceMotion,
    leituraPorVoz: prefs.screenReader,
    velocidadeVoz: Number(prefs.speechRate.toFixed(1)),
    libras: prefs.vlibras,
    destaqueFoco: prefs.focusHighlight,
  };
}

/** Converte a resposta do Backend para o formato local (campos ausentes são ignorados). */
export function prefsDaApi(dto: PreferenciasAcessibilidade): Partial<AccessibilityPrefs> {
  const parcial: Partial<AccessibilityPrefs> = {};
  if (dto.tema === "claro" || dto.tema === "escuro") parcial.darkMode = dto.tema === "escuro";
  if (typeof dto.altoContraste === "boolean") parcial.highContrast = dto.altoContraste;
  if (typeof dto.fonteDislexia === "boolean") parcial.dyslexiaFont = dto.fonteDislexia;
  if (typeof dto.escalaFonte === "number") parcial.fontScale = dto.escalaFonte / 100;
  if (typeof dto.reduzirAnimacoes === "boolean") parcial.reduceMotion = dto.reduzirAnimacoes;
  if (typeof dto.leituraPorVoz === "boolean") parcial.screenReader = dto.leituraPorVoz;
  if (dto.velocidadeVoz !== undefined && dto.velocidadeVoz !== null) {
    const taxa = Number(dto.velocidadeVoz);
    if (Number.isFinite(taxa) && taxa > 0) parcial.speechRate = taxa;
  }
  if (typeof dto.libras === "boolean") parcial.vlibras = dto.libras;
  if (typeof dto.destaqueFoco === "boolean") parcial.focusHighlight = dto.destaqueFoco;
  return parcial;
}

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
  async conversas(): Promise<ChatbotConversa[]> {
    const { data } = await api.get<{ conversas: ChatbotConversa[] }>("/chatbot/conversas");
    return data.conversas ?? [];
  },

  async mensagens(conversaId: string): Promise<ChatbotMensagem[]> {
    const { data } = await api.get<{ mensagens: ChatbotMensagem[] }>(
      `/chatbot/conversas/${conversaId}/mensagens`,
    );
    return data.mensagens ?? [];
  },

  /** Espelha o retorno real de `ChatbotService.enviar` no backend: `{ conversa, pergunta, resposta }`. */
  async enviar(
    conteudo: string,
    conversaId?: string | null,
  ): Promise<{ conversa: ChatbotConversa; pergunta: ChatbotMensagem; resposta: ChatbotMensagem }> {
    const { data } = await api.post<{
      conversa: ChatbotConversa;
      pergunta: ChatbotMensagem;
      resposta: ChatbotMensagem;
    }>("/chatbot/mensagens", { conteudo, conversaId: conversaId ?? null });
    return data;
  },

  async remover(conversaId: string): Promise<void> {
    await api.delete(`/chatbot/conversas/${conversaId}`);
  },
};

export default acessibilidadeService;
