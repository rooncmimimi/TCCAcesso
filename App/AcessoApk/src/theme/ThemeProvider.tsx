import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useFonts } from "expo-font";
import { useColorScheme } from "react-native";

import { useAccessibility } from "../accessibility";
import { buildAccessibleTheme } from "./accessibleTheme";
import { DYSLEXIA_FONT_ASSETS } from "./dyslexiaFont";
import type { Theme, ThemeMode } from "./themes";

/**
 * Fonte única de verdade do modo claro/escuro/alto contraste: as
 * preferências do `AccessibilityProvider` (Fase 5) — não existe mais o
 * `setMode` local que este arquivo tinha até a Fase 4 (era só uma
 * demonstração de que os temas funcionavam; a decisão real de qual tema
 * usar, e lembrar essa escolha, sempre foi descrita como trabalho desta
 * fase). Quando a preferência é `"system"`, resolve pelo esquema de cor do
 * próprio Android via `useColorScheme` (nenhuma dependência nova).
 *
 * Depende de estar dentro de `AccessibilityProvider` — por isso a ordem dos
 * providers em `App.tsx` importa (ver relatório final da Fase 5, "Ordem dos
 * Providers").
 */
type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const { preferences, effectiveReduceMotion } = useAccessibility();
  // Carrega os 5 pesos da Lexend usados por `dyslexiaFont` (Rodada 2) uma
  // única vez, aqui — não condicionado à preferência estar ativa, porque
  // `useFonts` precisa ser chamado sempre do mesmo jeito (regra dos hooks)
  // e os arquivos são locais (empacotados no app, não baixados), então não
  // há custo de rede em carregar mesmo sem a preferência ligada. Enquanto
  // `dyslexiaFontLoaded` ainda é `false` (só nos primeiros instantes depois
  // de abrir o app), `buildAccessibleTheme` ignora a preferência com
  // segurança — ver o comentário lá.
  const [dyslexiaFontLoaded] = useFonts(DYSLEXIA_FONT_ASSETS);

  const mode: ThemeMode =
    preferences.themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : preferences.themeMode;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: buildAccessibleTheme(mode, preferences, effectiveReduceMotion, dyslexiaFontLoaded), mode }),
    [mode, preferences, effectiveReduceMotion, dyslexiaFontLoaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return ctx;
}
