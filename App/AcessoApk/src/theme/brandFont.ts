// Mesma técnica de importação por subcaminho já usada em `dyslexiaFont.ts`
// (peso por peso, não o pacote inteiro) — evita empacotar pesos que o app
// não usa.
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";

import type { TypographyVariant } from "./typography";

/**
 * Redesign visual (unificação com o Site) — o Site usa duas famílias
 * (`Site/Frontend/src/styles/globals.css`, bloco `@theme inline`):
 * Manrope (`--font-sans`, corpo de texto) e Plus Jakarta Sans
 * (`--font-display`, só h1–h4). Até aqui o app usava a fonte padrão da
 * plataforma (Roboto) de propósito — `typography.ts` registrava isso como
 * "decisão pendente". Esta é essa decisão: carregar as duas fontes da marca,
 * pelo mesmo motivo e a mesma técnica já usados para `dyslexiaFont` (Lexend)
 * na Rodada 2 — arquivos locais, sem custo de rede, ~78-90KB por peso.
 *
 * Variante → família, não peso → família (diferente de `dyslexiaFont.ts`):
 * aqui DUAS fontes coexistem, e qual delas usar depende do PAPEL do texto
 * (título vs. corpo), não do peso numérico — replica exatamente a divisão
 * do Site (`h1,h2,h3,h4 { font-family: var(--font-display) }`, todo o
 * resto usa `--font-sans`). `display`/`heading`/`title` são os títulos do
 * app (equivalente aos `h1`-`h3` do Site); os demais são texto corrido.
 */
export const BRAND_FONT_ASSETS = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

export type BrandFontFamily = keyof typeof BRAND_FONT_ASSETS;

export const BRAND_FONT_FAMILY_BY_VARIANT: Record<TypographyVariant, BrandFontFamily> = {
  display: "PlusJakartaSans_800ExtraBold",
  heading: "PlusJakartaSans_700Bold",
  title: "PlusJakartaSans_700Bold",
  body: "Manrope_400Regular",
  bodySmall: "Manrope_400Regular",
  label: "Manrope_600SemiBold",
  caption: "Manrope_500Medium",
  button: "Manrope_700Bold",
};
