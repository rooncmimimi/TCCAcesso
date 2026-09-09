import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AccessibilityProvider } from "./src/accessibility";
import { AuthProvider } from "./src/auth";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { ThemeProvider } from "./src/theme";

/**
 * Ordem dos providers (Fase 5) — cada um só pode depender de quem está
 * FORA dele na árvore:
 *
 * 1. `SafeAreaProvider` — infraestrutura de layout pura, não depende de
 *    nada do app e nada do app depende de escolha nenhuma dela.
 * 2. `AccessibilityProvider` — lê preferências do `AsyncStorage` sozinho,
 *    sem depender de tema nem de sessão. Precisa vir ANTES do
 *    `ThemeProvider` porque é o `ThemeProvider` que consome
 *    `useAccessibility()` (tema/alto contraste/escala de fonte), nunca o
 *    contrário — colocá-lo depois criaria a dependência circular que o
 *    item 35 da Fase 5 pede pra evitar. Também precisa existir ANTES (fora)
 *    de `AuthProvider`: a acessibilidade tem que funcionar sem sessão
 *    nenhuma (item 8 da Fase 5).
 * 3. `ThemeProvider` — depende só do passo 2.
 * 4. `AuthProvider` — independente de tema/acessibilidade; só precisa
 *    existir antes do `RootNavigator`, que decide Auth/App a partir dele.
 * 5. `RootNavigator` — por último, e o único que depende de tudo acima.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AccessibilityProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </SafeAreaProvider>
  );
}
