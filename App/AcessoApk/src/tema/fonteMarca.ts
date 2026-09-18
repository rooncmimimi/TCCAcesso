// Mesma técnica de importação por subcaminho já usada em `fonteDislexia.ts`
// (peso por peso, não o pacote inteiro): evita empacotar pesos que o app
// não usa.
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";

import type { VarianteTipografia } from "./tipografia";

/**
 * Fontes da marca, as mesmas do Site (`Site/Frontend/src/styles/globals.css`): Manrope no texto
 * corrido (`--font-sans`) e Plus Jakarta Sans nos títulos (`--font-display`, h1 a h4). São
 * carregadas como a Lexend, de arquivos locais, sem custo de rede.
 *
 * O mapa é por variante, e não por peso como em `fonteDislexia.ts`, porque aqui duas famílias
 * convivem e a escolha depende do papel do texto: `display`, `heading` e `title` são os títulos do
 * app; as demais variantes são texto corrido.
 */
export const ARQUIVOS_FONTE_MARCA = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

export type FamiliaFonteMarca = keyof typeof ARQUIVOS_FONTE_MARCA;

export const FAMILIA_FONTE_MARCA_POR_VARIANTE: Record<VarianteTipografia, FamiliaFonteMarca> = {
  display: "PlusJakartaSans_800ExtraBold",
  heading: "PlusJakartaSans_700Bold",
  title: "PlusJakartaSans_700Bold",
  body: "Manrope_400Regular",
  bodySmall: "Manrope_400Regular",
  label: "Manrope_600SemiBold",
  caption: "Manrope_500Medium",
  button: "Manrope_700Bold",
};
