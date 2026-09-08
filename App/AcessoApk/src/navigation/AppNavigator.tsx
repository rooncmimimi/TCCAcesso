import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppTabs } from "./AppTabs";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Só existe a tela "Tabs" por enquanto. Este Stack existe desde já (em vez
 * das Bottom Tabs serem a raiz da área autenticada) para as próximas fases
 * poderem empilhar telas em tela cheia por cima das tabs — detalhe de vaga,
 * uma conversa de mensagens, etc. — sem precisar introduzir um Stack novo
 * depois e sem mexer no `RootNavigator`.
 */
export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
    </Stack.Navigator>
  );
}
