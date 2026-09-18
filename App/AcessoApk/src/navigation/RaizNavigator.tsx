import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAutenticacao } from "../autenticacao";
import { BloqueioBiometricoScreen } from "../screens/BloqueioBiometricoScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { ContaNaoSuportadaScreen } from "../screens/ContaNaoSuportadaScreen";
import { useSeguranca } from "../seguranca";
import { AppNavigator } from "./AppNavigator";
import { AutenticacaoNavigator } from "./AutenticacaoNavigator";
import { linking } from "./linking";
import type { RaizStackParamList } from "./types";

const Stack = createNativeStackNavigator<RaizStackParamList>();

/**
 * Ref do container de navegação, para navegar de fora dos componentes (padrão do React Navigation).
 * Hoje só o toque em push usa (`navegacaoPorToqueEmPush.ts`).
 */
export const refNavegacao = createNavigationContainerRef<RaizStackParamList>();

/**
 * Raiz da navegação: escolhe entre splash, telas de entrada, conta não suportada, desbloqueio
 * biométrico e app a partir do `status` do `AutenticacaoProvider` e do `useSeguranca()`, sem estado
 * de login próprio.
 *
 * O `Stack.Navigator` tem uma única tela montada por vez. Quando o conjunto de telas muda, o React
 * Navigation descarta o estado anterior e começa do zero: depois do login não há como voltar à tela
 * de entrada pelo botão físico, e depois do logout nenhuma tela do app fica na pilha. Por isso não
 * há `navigation.reset()` manual.
 */
export function RaizNavigator() {
  const { status } = useAutenticacao();
  // `carregando` aqui é a leitura do hardware e da preferência de biometria; usa a mesma splash da
  // restauração da sessão.
  const { carregando: carregandoSeguranca, precisaDesbloquear } = useSeguranca();

  return (
    <NavigationContainer ref={refNavegacao} linking={linking} fallback={<SplashScreen />}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === "carregando" || (status === "autenticado" && carregandoSeguranca) ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : status === "naoAutenticado" ? (
          <Stack.Screen name="Auth" component={AutenticacaoNavigator} />
        ) : status === "naoSuportado" ? (
          // Conta de administrador fica neste ramo, sem acesso ao app; a única saída é o botão Sair
          // da própria tela.
          <Stack.Screen name="Unsupported" component={ContaNaoSuportadaScreen} />
        ) : precisaDesbloquear ? (
          // Sessão autenticada, mas com o conteúdo atrás da biometria: este ramo entra antes do
          // `AppNavigator` sem mexer no `status` da sessão.
          <Stack.Screen name="BiometricLock" component={BloqueioBiometricoScreen} />
        ) : (
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
