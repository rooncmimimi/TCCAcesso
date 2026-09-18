import type { PreferenciasAcessibilidade } from "./types";

/**
 * Estado inicial antes da leitura do armazenamento, e também o usado quando essa leitura falha.
 * Nenhum ajuste começa ligado: o tema segue o sistema e cada pessoa ativa o que precisar.
 */
export const PREFERENCIAS_ACESSIBILIDADE_PADRAO: PreferenciasAcessibilidade = {
  themeMode: "system",
  highContrast: false,
  fontScale: "medium",
  letterSpacing: "normal",
  lineHeightScale: "normal",
  dyslexiaFont: false,
  largeCursor: false,
  reduceMotion: false,
  enhancedFocus: false,
  keyboardNavigation: false,
  voiceEnabled: false,
};
