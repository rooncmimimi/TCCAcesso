import type { TextStyle } from "react-native";

/**
 * Hierarquia tipográfica base do app. Todos os tamanhos usam `lineHeight` generoso, nunca altura
 * fixa de container, para textos maiores não serem cortados.
 *
 * São só os valores base: as telas leem sempre `tema.typography` (via `useTema()`), calculado em
 * `tema/temaAcessivel.ts` a partir destes valores com as preferências de escala, espaçamento e
 * fonte. Por isso `letterSpacing` e `fontFamily` são opcionais aqui: os tokens base não definem
 * nenhum, e só o resultado calculado recebe a fonte da marca ou a Lexend.
 */
export type TokenTipografia = Pick<TextStyle, "fontFamily" | "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing">;

export const tipografia = {
  display: { fontSize: 32, fontWeight: "800", lineHeight: 40 },
  heading: { fontSize: 24, fontWeight: "700", lineHeight: 32 },
  title: { fontSize: 18, fontWeight: "700", lineHeight: 26 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  button: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
} satisfies Record<string, TokenTipografia>;

export type VarianteTipografia = keyof typeof tipografia;
