import type { TextStyle } from "react-native";

/**
 * Hierarquia tipográfica do app. Usa a fonte padrão da plataforma (Roboto
 * no Android) de propósito — carregar as fontes de marca do site (Plus
 * Jakarta Sans / Manrope) exigiria uma dependência nova de carregamento de
 * fonte, então isso fica como decisão pendente, registrada no relatório
 * desta fase, em vez de decidida sozinha aqui.
 *
 * Todos os tamanhos usam `lineHeight` generoso (nunca altura fixa de
 * container) para textos maiores ou traduções mais longas não cortarem.
 *
 * Estes são os valores BASE (escala de fonte normal, espaçamento de letra
 * normal) — quem lê tipografia em qualquer tela é sempre `theme.typography`
 * (via `useTheme()`), nunca este objeto diretamente. `theme.typography` é
 * calculado a partir destes valores em `theme/accessibleTheme.ts` (Fase 5),
 * aplicando `fontScale`/`letterSpacing`/`lineHeightScale` do
 * `AccessibilityProvider` — por isso o campo `letterSpacing` é opcional
 * aqui (os valores base não têm nenhum) mas sempre presente no resultado
 * escalado.
 */
export type TypographyToken = Pick<TextStyle, "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing">;

export const typography = {
  display: { fontSize: 32, fontWeight: "800", lineHeight: 40 },
  heading: { fontSize: 24, fontWeight: "700", lineHeight: 32 },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  button: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
} satisfies Record<string, TypographyToken>;

export type TypographyVariant = keyof typeof typography;
