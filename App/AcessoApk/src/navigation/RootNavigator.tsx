import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { BiometricLockScreen } from "../screens/BiometricLockScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { UnsupportedAccountScreen } from "../screens/UnsupportedAccountScreen";
import { useSeguranca } from "../seguranca";
import { AppNavigator } from "./AppNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { linking } from "./linking";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Ref do container de navegação — usada para navegar a partir de FORA de um
 * componente React (padrão oficial do React Navigation). Hoje só o toque num
 * push nativo (Fase R5, `navigation/pushTapNavigation.ts`) precisa disso;
 * tudo o mais navega via `useNavigation()`/props normalmente.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Raiz de toda a navegação. Decide entre Splash/Auth/Unsupported/App
 * consumindo `status` do `AuthProvider` já existente — não duplica essa
 * lógica (Fase 4, item 9): não existe aqui nenhum `isLoggedIn` próprio, só
 * uma leitura de `useAuth()`.
 *
 * O `Stack.Navigator` sempre tem exatamente UMA `Stack.Screen` montada por
 * vez, escolhida por este `if/else`. Isso não é só uma troca de tela: toda
 * vez que o CONJUNTO de screens de um `Stack.Navigator` muda (e aqui ele
 * muda completamente a cada transição de `status`), o React Navigation
 * descarta o estado de navegação anterior e cria um estado novo do zero.
 * É esse comportamento — documentado oficialmente, não um efeito colateral —
 * que garante os itens 10 e 11 da Fase 4 de graça: depois do login, "Auth"
 * (com "Login" no meio da pilha) deixa de existir, então não há como voltar
 * para lá com o botão físico; depois do logout, o mesmo vale ao contrário
 * para qualquer tela do "App". Não foi preciso nenhum `navigation.reset()`
 * manual.
 */
export function RootNavigator() {
  const { status } = useAuth();
  // Fase 22: `carregando` aqui é a leitura de hardware/preferência de
  // bloqueio biométrico — tão rápida quanto a de `AuthProvider`, tratada
  // com a MESMA tela de Splash (não é um novo estado de loading visível,
  // só estende quanto tempo o Splash já ficava na tela).
  const { carregando: carregandoSeguranca, precisaDesbloquear } = useSeguranca();

  return (
    <NavigationContainer ref={navigationRef} linking={linking} fallback={<SplashScreen />}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === "loading" || (status === "authenticated" && carregandoSeguranca) ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
        ) : status === "unauthenticated" ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : status === "unsupported" ? (
          // Conta `administrador`: nunca entra no App Stack comum (Fase 4,
          // item 22/23) — fica presa neste ramo, com a única saída sendo o
          // botão "Sair" já existente na própria tela.
          <Stack.Screen name="Unsupported" component={UnsupportedAccountScreen} />
        ) : precisaDesbloquear ? (
          // Fase 22: sessão já autenticada, mas o CONTEÚDO fica atrás da
          // biometria — nunca substitui `status`, só intercepta ANTES de
          // `AppNavigator` renderizar (mesma técnica de "um branch a mais
          // no if/else", nunca um `isLoggedIn` paralelo).
          <Stack.Screen name="BiometricLock" component={BiometricLockScreen} />
        ) : (
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
