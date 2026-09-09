import type { AccessibilityPreferences } from "./accessibilityTypes";

/**
 * Estado inicial antes de qualquer preferência salva ser lida — e o estado
 * usado se a leitura do armazenamento falhar ou vier corrompida. Nenhuma
 * opção começa "ativada" por padrão: o app abre do jeito que o design
 * system já define (tema claro/escuro seguindo o sistema, sem nenhum ajuste
 * extra), e o usuário opta por cada ajuste.
 */
export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
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
