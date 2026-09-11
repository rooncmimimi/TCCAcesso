import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AccessibilityProvider } from "./src/accessibility";
import { AuthProvider } from "./src/auth";
import { ligarNavegacaoPorToqueEmPush } from "./src/navigation/pushTapNavigation";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { configurarNotificacoesPush } from "./src/notificacoes";
import { ErrorBoundary, inicializarObservabilidade } from "./src/observabilidade";
import { SegurancaProvider } from "./src/seguranca";
import { ThemeProvider } from "./src/theme";

// Fase 25 — chamada uma única vez, no carregamento do módulo (antes de
// qualquer render): sem DSN configurado (`.env`), vira um no-op completo
// (ver `observabilidade/sentry.ts`).
inicializarObservabilidade();

// Fase R5 — define como um push aparece com o app aberto. Idempotente e sem
// efeito colateral se `expo-notifications` não tiver credenciais (só passa a
// entregar de verdade depois do `eas init` + credenciais de FCM/APNs).
configurarNotificacoesPush();

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
 * 5. `SegurancaProvider` (Fase 22) — depende de `useAuth()` (passo 4), por
 *    isso vem depois dele; precisa existir ANTES (fora) de `RootNavigator`,
 *    que consome `useSeguranca()` para decidir se mostra
 *    `BiometricLockScreen`, e `BiometricLockScreen` é uma das telas que o
 *    próprio `RootNavigator` renderiza — as duas precisam compartilhar a
 *    MESMA instância do estado de bloqueio (ver `SegurancaProvider.tsx`).
 * 6. `RootNavigator` — por último, e o único que depende de tudo acima.
 *
 * `ErrorBoundary` (Fase 25) fica FORA de tudo isso, de propósito — precisa
 * continuar de pé mesmo se o erro acontecer dentro de um destes provedores
 * (ver o comentário do próprio componente para o porquê disso implicar
 * nunca usar `useTheme()`/`components/ui` dentro dele).
 */
export default function App() {
  // Fase R5 — toque num push nativo navega para o conteúdo relacionado
  // (via `navigationRef`, fora da árvore de componentes). Cancela ao
  // desmontar, mesmo o `App` nunca desmontando de verdade em produção.
  useEffect(() => ligarNavegacaoPorToqueEmPush(), []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AccessibilityProvider>
          <ThemeProvider>
            <AuthProvider>
              <SegurancaProvider>
                <RootNavigator />
                <StatusBar style="auto" />
              </SegurancaProvider>
            </AuthProvider>
          </ThemeProvider>
        </AccessibilityProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
