import clienteApi from "./api";
import type { ChatbotConversa, ChatbotMensagem, PreferenciasAcessibilidadeApi } from "@/types";
import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

/** Converte as preferências locais para o formato aceito pelo Backend. */
export function preferenciasParaApi(prefs: PreferenciasAcessibilidade): PreferenciasAcessibilidadeApi {
  return {
    tema: prefs.darkMode ? "escuro" : "claro",
    altoContraste: prefs.highContrast,
    fonteDislexia: prefs.dyslexiaFont,
    escalaFonte: Math.min(200, Math.max(80, Math.round(prefs.fontScale * 100))),
    espacamentoTexto: prefs.letterSpacing > 0 || prefs.lineHeight > 1.6,
    reduzirAnimacoes: prefs.reduceMotion,
    leituraPorVoz: prefs.screenReader,
    // `voiceConsent` só vai no payload quando já tem resposta (`true` ou `false`). Com `null`
    // (nunca perguntado), o campo fica de fora, para salvar uma preferência sem relação, como o
    // tamanho da fonte, não apagar no backend uma resposta já dada.
    consentimentoVoz: prefs.voiceConsent ?? undefined,
    velocidadeVoz: Number(prefs.speechRate.toFixed(1)),
    libras: prefs.vlibras,
    destaqueFoco: prefs.focusHighlight,
  };
}

/** Converte a resposta do Backend para o formato local (campos ausentes são ignorados). */
export function preferenciasDaApi(dto: PreferenciasAcessibilidadeApi): Partial<PreferenciasAcessibilidade> {
  const parcial: Partial<PreferenciasAcessibilidade> = {};
  if (dto.tema === "claro" || dto.tema === "escuro") parcial.darkMode = dto.tema === "escuro";
  if (typeof dto.altoContraste === "boolean") parcial.highContrast = dto.altoContraste;
  if (typeof dto.fonteDislexia === "boolean") parcial.dyslexiaFont = dto.fonteDislexia;
  if (typeof dto.escalaFonte === "number") parcial.fontScale = dto.escalaFonte / 100;
  if (typeof dto.reduzirAnimacoes === "boolean") parcial.reduceMotion = dto.reduzirAnimacoes;
  if (typeof dto.leituraPorVoz === "boolean") parcial.screenReader = dto.leituraPorVoz;
  // Propaga os três estados (`true`/`false`/`null`): `null` também é um
  // valor real aqui (ainda não respondeu), diferente dos outros campos
  // acima que só existem como boolean.
  if (typeof dto.consentimentoVoz === "boolean" || dto.consentimentoVoz === null) {
    parcial.voiceConsent = dto.consentimentoVoz;
  }
  if (dto.velocidadeVoz !== undefined && dto.velocidadeVoz !== null) {
    const taxa = Number(dto.velocidadeVoz);
    if (Number.isFinite(taxa) && taxa > 0) parcial.speechRate = taxa;
  }
  if (typeof dto.libras === "boolean") parcial.vlibras = dto.libras;
  if (typeof dto.destaqueFoco === "boolean") parcial.focusHighlight = dto.destaqueFoco;
  return parcial;
}

export const acessibilidadeService = {
  async obter(): Promise<PreferenciasAcessibilidadeApi> {
    const { data } = await clienteApi.get<{ preferencias: PreferenciasAcessibilidadeApi }>("/acessibilidade");
    return data.preferencias ?? {};
  },

  async salvar(payload: PreferenciasAcessibilidadeApi): Promise<PreferenciasAcessibilidadeApi> {
    const { data } = await clienteApi.put<{ preferencias: PreferenciasAcessibilidadeApi }>(
      "/acessibilidade",
      payload,
    );
    return data.preferencias ?? {};
  },

  async restaurar(): Promise<PreferenciasAcessibilidadeApi> {
    const { data } = await clienteApi.post<{ preferencias: PreferenciasAcessibilidadeApi }>(
      "/acessibilidade/reset",
    );
    return data.preferencias ?? {};
  },
};

/** Assistente virtual (chatbot) com conversas persistidas. */
export const chatbotService = {
  async conversas(): Promise<ChatbotConversa[]> {
    const { data } = await clienteApi.get<{ conversas: ChatbotConversa[] }>("/chatbot/conversas");
    return data.conversas ?? [];
  },

  async mensagens(conversaId: string): Promise<ChatbotMensagem[]> {
    const { data } = await clienteApi.get<{ mensagens: ChatbotMensagem[] }>(
      `/chatbot/conversas/${conversaId}/mensagens`,
    );
    return data.mensagens ?? [];
  },

  /** Espelha o retorno real de `ChatbotService.enviar` no backend: `{ conversa, pergunta, resposta }`. */
  async enviar(
    conteudo: string,
    conversaId?: string | null,
  ): Promise<{ conversa: ChatbotConversa; pergunta: ChatbotMensagem; resposta: ChatbotMensagem }> {
    const { data } = await clienteApi.post<{
      conversa: ChatbotConversa;
      pergunta: ChatbotMensagem;
      resposta: ChatbotMensagem;
    }>("/chatbot/mensagens", { conteudo, conversaId: conversaId ?? null });
    return data;
  },

  async remover(conversaId: string): Promise<void> {
    await clienteApi.delete(`/chatbot/conversas/${conversaId}`);
  },
};

export default acessibilidadeService;
