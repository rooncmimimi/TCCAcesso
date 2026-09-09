import { brand, darkColors, lightColors } from "./colors";
import { radius } from "./radius";
import { shadow } from "./shadows";
import { sizes } from "./sizes";
import { spacing } from "./spacing";
import { typography, type TypographyToken, type TypographyVariant } from "./typography";

/**
 * "light"/"dark" continuam sendo os dois únicos modos — alto contraste
 * (Fase 5) NÃO virou um terceiro modo aqui de propósito: o Android trata
 * "contraste alto" como um ajuste sobre o tema ativo, não como um tema à
 * parte (dá pra ter alto contraste + claro OU alto contraste + escuro). A
 * troca de paleta por alto contraste acontece em
 * `theme/accessibleTheme.ts`, não aqui — `themes.light`/`themes.dark`
 * continuam sendo o tema "puro", sem nenhum ajuste de acessibilidade, e
 * nenhum componente (Button/Card/Input/Badge) precisou mudar para isso,
 * porque todos leem cor por token, nunca por hex. Ver
 * `src/accessibility/README.md`.
 */
export type ThemeMode = "light" | "dark";

/**
 * Valores derivados de acessibilidade que qualquer componente pode ler
 * direto de `theme.a11y` sem precisar chamar `useAccessibility()` (Fase 5)
 * — mesma ideia de `theme.colors`/`theme.typography`: o componente lê o
 * TOKEN já resolvido, nunca a preferência bruta. `buildTheme()` abaixo
 * preenche isto com valores neutros (tema "puro", sem nenhum ajuste); quem
 * de fato aplica as preferências é `buildAccessibleTheme()` em
 * `accessibleTheme.ts`.
 */
export type ThemeAccessibilityTokens = {
  highContrast: boolean;
  /** Já é o valor EFETIVO (preferência do usuário OU sinal do sistema) — nunca a preferência bruta sozinha. */
  reduceMotion: boolean;
  enhancedFocus: boolean;
  /** Espessura do anel de foco visível em px — 2 normal, 4 com `enhancedFocus`. */
  focusRingWidth: number;
};

export type Theme = {
  mode: ThemeMode;
  colors: typeof lightColors;
  brand: typeof brand;
  /**
   * `Record<...>` genérico, não `typeof typography` — o objeto base é
   * literal de propósito (cada variante com seu próprio `fontWeight` exato),
   * mas o que os componentes de fato consomem em `theme.typography` é
   * SEMPRE recalculado por `buildAccessibleTheme()` (Fase 5, escala de
   * fonte/espaçamento), então o tipo aqui precisa aceitar qualquer valor
   * dentro do formato de `TypographyToken`, não só os literais originais.
   */
  typography: Record<TypographyVariant, TypographyToken>;
  spacing: typeof spacing;
  radius: typeof radius;
  sizes: typeof sizes;
  shadow: typeof shadow;
  a11y: ThemeAccessibilityTokens;
};

function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: mode === "dark" ? darkColors : lightColors,
    brand,
    typography,
    spacing,
    radius,
    sizes,
    shadow,
    a11y: { highContrast: false, reduceMotion: false, enhancedFocus: false, focusRingWidth: 2 },
  };
}

export const themes: Record<ThemeMode, Theme> = {
  light: buildTheme("light"),
  dark: buildTheme("dark"),
};
