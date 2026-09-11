/**
 * Modelo de preferências de acessibilidade do app.
 *
 * IMPORTANTE — o que NÃO está aqui, de propósito:
 *
 * `screenReader` não é uma preferência (não existe "ligar/desligar o
 * TalkBack" a partir do app — é um serviço do sistema Android). Por isso
 * mora como estado DERIVADO, só leitura, em `AccessibilitySystemState`
 * (detectado via `AccessibilityInfo`), nunca aqui dentro — misturar os dois
 * faria parecer que dá pra "ativar TalkBack" tocando num botão do ACESSO,
 * o que é falso.
 *
 * `keyboardNavigation` e `largeCursor` EXISTEM aqui (a Fase 5 pediu a
 * arquitetura pronta pra elas), mas nenhuma das duas tem efeito visual ou
 * comportamental hoje — Android não expõe uma API pra "modo de navegação
 * por teclado" nem pra "cursor ampliado" que um app comum consiga controlar
 * (não existe cursor de mouse em toque comum, e o foco por teclado/D-pad já
 * funciona sempre, independente de qualquer flag). Ver `README.md` desta
 * pasta para o detalhamento completo, preferência por preferência.
 *
 * `dyslexiaFont` TEM efeito real desde a Rodada 2 da auditoria de
 * acessibilidade — troca `fontFamily` pela Lexend (`theme/dyslexiaFont.ts`,
 * aplicado em `theme/accessibleTheme.ts`). Ficou de fora do parágrafo acima
 * de propósito: só `keyboardNavigation`/`largeCursor` continuam sem efeito.
 */
export interface AccessibilityPreferences {
  /** Fonte de verdade do tema claro/escuro do app inteiro — substitui o antigo `setMode` local do `ThemeProvider` (Fase 2/3). */
  themeMode: ThemeModePreference;
  /** Variação de alto contraste do tema ativo (não é um modo à parte — ver `theme/accessibleTheme.ts`). */
  highContrast: boolean;
  fontScale: FontScaleKey;
  letterSpacing: LetterSpacingKey;
  lineHeightScale: LineHeightScaleKey;
  /** Real (Rodada 2). Troca a fonte do app pela Lexend (`theme/dyslexiaFont.ts`) quando ativa. */
  dyslexiaFont: boolean;
  /** Preparado, sem efeito — não existe cursor de mouse em interfaces de toque comuns, e a plataforma não expõe um "cursor do sistema" controlável por um app comum. Ver `README.md` (Rodada 2). */
  largeCursor: boolean;
  reduceMotion: boolean;
  enhancedFocus: boolean;
  /** Preparado, sem efeito controlável hoje — o foco por teclado/D-pad do Android já funciona sempre, não é algo que liga/desliga. */
  keyboardNavigation: boolean;
  /** Consentimento para o app usar Text-to-Speech (futura integração com `expo-speech`, Fase 6+) — diferente de TalkBack. Ver `README.md`. */
  voiceEnabled: boolean;
}

export type ThemeModePreference = "light" | "dark" | "system";
export type FontScaleKey = "small" | "medium" | "large" | "extraLarge";
export type LetterSpacingKey = "normal" | "comfortable" | "wide";
export type LineHeightScaleKey = "normal" | "relaxed" | "loose";

/** Só as chaves booleanas — o que `togglePreference` aceita (as demais são enums, exigem um valor específico via `setPreference`). */
export type BooleanPreferenceKey = {
  [K in keyof AccessibilityPreferences]: AccessibilityPreferences[K] extends boolean ? K : never;
}[keyof AccessibilityPreferences];

/**
 * Estado do SISTEMA (Android), não do app — só leitura, nunca persistido
 * por nós (é o próprio Android que já persiste isso), nunca setável por
 * `setPreference`/`togglePreference`.
 */
export interface AccessibilitySystemState {
  /** `AccessibilityInfo.isScreenReaderEnabled()` — TalkBack ou outro leitor de tela ativo. Ver item 32 do relatório: o RN não distingue QUAL leitor de tela está ativo, só que algum está. */
  screenReaderEnabled: boolean;
  /** `AccessibilityInfo.isReduceMotionEnabled()` — a opção "Remover animações" do Android. */
  reduceMotionEnabled: boolean;
}

export interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  /** `true` só durante a leitura inicial do armazenamento local — nunca depois disso. */
  isLoading: boolean;
  setPreference: <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => void;
  togglePreference: (key: BooleanPreferenceKey) => void;
  resetPreferences: () => void;
  system: AccessibilitySystemState;
  /** `preferences.reduceMotion || system.reduceMotionEnabled` — ver item 18/decisão "Movimento" do relatório. */
  effectiveReduceMotion: boolean;
}
