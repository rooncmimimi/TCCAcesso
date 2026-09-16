import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useFonts } from "expo-font";
import { useColorScheme } from "react-native";

import { useAccessibility } from "../accessibility";
import { buildAccessibleTheme } from "./accessibleTheme";
import { BRAND_FONT_ASSETS } from "./brandFont";
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
  // Uma única chamada a `useFonts` para os dois conjuntos (regra dos hooks:
  // sempre a mesma quantidade/ordem de chamadas) — Lexend (`dyslexiaFont`,
  // Rodada 2) e Manrope/Plus Jakarta Sans (fontes da marca, redesign
  // visual). Nenhum dos dois depende de rede (arquivos locais, empacotados
  // no app), então carregar os dois sempre não tem custo de conexão; o
  // único custo é o tamanho do pacote (~900KB somados), aceito pelo mesmo
  // motivo já registrado para a Lexend. Enquanto `fontsLoaded` ainda é
  // `false` (só nos primeiros instantes de abrir o app), `buildAccessibleTheme`
  // ignora as duas preferências com segurança — ver o comentário lá.
  const [fontsLoaded] = useFonts({ ...DYSLEXIA_FONT_ASSETS, ...BRAND_FONT_ASSETS });

  const mode: ThemeMode =
    preferences.themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : preferences.themeMode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: buildAccessibleTheme(mode, preferences, effectiveReduceMotion, fontsLoaded, fontsLoaded),
      mode,
    }),
    [mode, preferences, effectiveReduceMotion, fontsLoaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de ThemeProvider");
  return ctx;
}
