import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { useAccessibility } from "../accessibility";
import { buildAccessibleTheme } from "./accessibleTheme";
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

  const mode: ThemeMode =
    preferences.themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : preferences.themeMode;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: buildAccessibleTheme(mode, preferences, effectiveReduceMotion), mode }),
    [mode, preferences, effectiveReduceMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return ctx;
}
