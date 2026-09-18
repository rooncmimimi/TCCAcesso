import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AcessibilidadeProvider } from "./src/acessibilidade";
import { AutenticacaoProvider } from "./src/autenticacao";
import { ligarNavegacaoPorToqueEmPush } from "./src/navigation/navegacaoPorToqueEmPush";
import { RaizNavigator } from "./src/navigation/RaizNavigator";
import { configurarNotificacoesPush } from "./src/notificacoes";
import { ErrorBoundary, inicializarObservabilidade } from "./src/observabilidade";
import { SegurancaProvider } from "./src/seguranca";
import { TemaProvider } from "./src/tema";

// Inicializa o Sentry antes do primeiro render. Sem DSN configurado no `.env`, não faz nada (ver
// `observabilidade/sentry.ts`).
inicializarObservabilidade();

// Define como um push aparece com o app aberto. Pode rodar sem credenciais de FCM/APNs; os pushes
// só passam a chegar depois que elas forem configuradas no EAS.
configurarNotificacoesPush();

/**
 * A ordem dos providers segue as dependências: cada um só usa o que está por fora dele.
 *
 * - `AcessibilidadeProvider` vem antes do `TemaProvider`, que lê dele tema, contraste e escalas de
 *   texto, e antes da sessão, porque as preferências valem também na tela de login.
 * - `AutenticacaoProvider` envolve o `RaizNavigator`, que escolhe entre as telas de entrada e o app
 *   pela sessão.
 * - `SegurancaProvider` usa a sessão e fica por fora do `RaizNavigator`, que consulta o bloqueio
 *   biométrico para decidir se mostra a tela de desbloqueio.
 *
 * O `ErrorBoundary` envolve tudo para continuar de pé mesmo quando o erro acontece dentro de um
 * provider.
 */
export default function App() {
  // Tocar num push abre o conteúdo relacionado (ver `navigation/navegacaoPorToqueEmPush.ts`).
  useEffect(() => ligarNavegacaoPorToqueEmPush(), []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AcessibilidadeProvider>
          <TemaProvider>
            <AutenticacaoProvider>
              <SegurancaProvider>
                <RaizNavigator />
                <StatusBar style="auto" />
              </SegurancaProvider>
            </AutenticacaoProvider>
          </TemaProvider>
        </AcessibilidadeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
