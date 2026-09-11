import type {
  AccessibilityPreferences,
  FontScaleKey,
  LetterSpacingKey,
  LineHeightScaleKey,
} from "../accessibility/accessibilityTypes";
import { darkHighContrastColors, lightHighContrastColors } from "./colors";
import { DYSLEXIA_FONT_FAMILY_BY_WEIGHT } from "./dyslexiaFont";
import { themes, type Theme, type ThemeMode } from "./themes";
import { typography as baseTypography, type TypographyToken, type TypographyVariant } from "./typography";

/**
 * Multiplicador de `fontSize`/`lineHeight`. `small` existe para quem prefere
 * uma interface mais compacta (também é uma preferência de acessibilidade
 * válida, não só "aumentar"). Faixa deliberadamente contida (0.9–1.3): o
 * objetivo é uma leitura mais confortável, não quebrar layout — botões
 * continuam com `minHeight` fixo (não escalado) e nenhum ícone/espaçamento
 * estrutural muda de tamanho junto (Fase 5, item 11).
 */
const FONT_SCALE_MULTIPLIER: Record<FontScaleKey, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  extraLarge: 1.3,
};

/**
 * Fração do `fontSize` (não um valor fixo em px — um espaçamento de letra
 * fixo ficaria minúsculo num título e enorme numa legenda). `wide` usa
 * 0.12, a própria referência do WCAG 2.2, critério 1.4.12 (Text Spacing):
 * espaçamento de letra de até 0.12× o tamanho da fonte precisa continuar
 * legível.
 */
const LETTER_SPACING_FACTOR: Record<LetterSpacingKey, number> = {
  normal: 0,
  comfortable: 0.06,
  wide: 0.12,
};

/** Multiplica o `lineHeight` já escalado por `fontScale` — as duas coisas combinadas, não duas alterações independentes (Fase 5, item 13). */
const LINE_HEIGHT_MULTIPLIER: Record<LineHeightScaleKey, number> = {
  normal: 1,
  relaxed: 1.15,
  loose: 1.3,
};

/**
 * `dyslexiaFontActive` já vem calculado (preferência E fonte de fato
 * carregada — ver `buildAccessibleTheme`) em vez de recebido como a
 * preferência bruta, mesmo padrão de `effectiveReduceMotion`: um único
 * lugar decide a regra de prioridade, esta função só aplica o resultado.
 */
function scaleTypography(
  preferences: AccessibilityPreferences,
  dyslexiaFontActive: boolean,
): Record<TypographyVariant, TypographyToken> {
  const fontFactor = FONT_SCALE_MULTIPLIER[preferences.fontScale];
  const letterFactor = LETTER_SPACING_FACTOR[preferences.letterSpacing];
  const lineFactor = LINE_HEIGHT_MULTIPLIER[preferences.lineHeightScale];

  const resultado = {} as Record<TypographyVariant, TypographyToken>;

  for (const chave of Object.keys(baseTypography) as TypographyVariant[]) {
    const token = baseTypography[chave];
    const fontSize = Math.round(token.fontSize! * fontFactor);
    const lineHeight = Math.round(token.lineHeight! * fontFactor * lineFactor);
    const letterSpacing = Math.round(fontSize * letterFactor * 10) / 10;
    // Cada variante de tipografia usa um `fontWeight` diferente (ver
    // `typography.ts`) — uma fonte carregada via `expo-font` só respeita o
    // peso EXATO do arquivo carregado, então o `fontFamily` certo depende
    // do `fontWeight` do próprio token, nunca um valor único fixo para
    // todas as variantes. Se o peso não estiver no mapa (não deveria
    // acontecer — `dyslexiaFont.ts` cobre todos os pesos usados aqui),
    // fica sem `fontFamily`: cai na fonte padrão da plataforma em vez de
    // quebrar.
    const fontFamily = dyslexiaFontActive ? DYSLEXIA_FONT_FAMILY_BY_WEIGHT[String(token.fontWeight)] : undefined;

    resultado[chave] = { ...token, fontSize, lineHeight, letterSpacing, ...(fontFamily ? { fontFamily } : {}) };
  }

  return resultado;
}

/**
 * Ponto único onde as preferências de acessibilidade viram, de fato, o
 * tema que os componentes consomem. Chamado só pelo `ThemeProvider` — mais
 * ninguém deveria precisar disto diretamente.
 *
 * `effectiveReduceMotion` é passado já calculado (preferência OU sistema)
 * em vez de recalculado aqui — o `AccessibilityProvider` é a única fonte
 * desse cálculo (ver seu comentário sobre a regra de prioridade).
 *
 * `dyslexiaFontLoaded` tem um valor padrão (`false`) só para não quebrar
 * quem já chamava esta função com 3 argumentos (ex.: os testes existentes
 * antes da Rodada 2) — `ThemeProvider.tsx` sempre passa o valor real,
 * vindo de `useFonts()` (`expo-font`). Enquanto a fonte ainda não carregou
 * (poucos milissegundos no início do app — os arquivos são locais, não
 * baixados da rede), a preferência `dyslexiaFont` fica sem efeito visual
 * temporariamente em vez de quebrar com um `fontFamily` inexistente; assim
 * que `useFonts()` resolve, o React já re-renderiza com a fonte certa
 * automaticamente, sem precisar reiniciar o app.
 */
export function buildAccessibleTheme(
  mode: ThemeMode,
  preferences: AccessibilityPreferences,
  effectiveReduceMotion: boolean,
  dyslexiaFontLoaded = false,
): Theme {
  const base = themes[mode];

  const colors = preferences.highContrast
    ? mode === "dark"
      ? darkHighContrastColors
      : lightHighContrastColors
    : base.colors;

  const dyslexiaFontActive = preferences.dyslexiaFont && dyslexiaFontLoaded;

  return {
    ...base,
    colors,
    typography: scaleTypography(preferences, dyslexiaFontActive),
    a11y: {
      highContrast: preferences.highContrast,
      reduceMotion: effectiveReduceMotion,
      enhancedFocus: preferences.enhancedFocus,
      focusRingWidth: preferences.enhancedFocus ? 4 : 2,
    },
  };
}
