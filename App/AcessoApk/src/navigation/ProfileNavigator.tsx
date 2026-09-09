import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AccessibilityScreen } from "../screens/AccessibilityScreen";
import { ActivitiesScreen } from "../screens/ActivitiesScreen";
import { BlockedUsersScreen } from "../screens/BlockedUsersScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { HelpScreen } from "../screens/HelpScreen";
import { JobApplicantsScreen } from "../screens/JobApplicantsScreen";
import { JobFormScreen } from "../screens/JobFormScreen";
import { MyJobsScreen } from "../screens/MyJobsScreen";
import { MyProfileScreen } from "../screens/MyProfileScreen";
import { ProfileMenuScreen } from "../screens/ProfileMenuScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useTheme } from "../theme";
import type { ProfileStackParamList } from "./types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Dá "navegação interna" à aba Perfil (Fase 4, item 20) — em vez de virar
 * uma tab pra cada tela (Configurações, Acessibilidade, Ajuda...), a aba
 * "Perfil" renderiza este Stack inteiro. `ProfileMenu` é a tela que a aba
 * mostra por padrão; o resto é empilhado por cima quando o usuário toca um
 * item do menu — com cabeçalho e "voltar" nativos do Android de graça.
 */
export function ProfileNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ProfileMenu" component={ProfileMenuScreen} options={{ title: "Perfil" }} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: "Meu perfil" }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: "Atividades" }} />
      <Stack.Screen name="Discover" component={DiscoverScreen} options={{ title: "Descobrir" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Configurações" }} />
      <Stack.Screen name="Accessibility" component={AccessibilityScreen} options={{ title: "Acessibilidade" }} />
      <Stack.Screen name="Help" component={HelpScreen} options={{ title: "Ajuda" }} />
      <Stack.Screen name="MyJobs" component={MyJobsScreen} options={{ title: "Minhas Vagas" }} />
      <Stack.Screen
        name="JobForm"
        component={JobFormScreen}
        options={({ route }) => ({ title: route.params.vagaId ? "Editar vaga" : "Nova vaga" })}
      />
      <Stack.Screen
        name="JobApplicants"
        component={JobApplicantsScreen}
        options={({ route }) => ({ title: route.params.vagaTitulo || "Candidaturas" })}
      />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ title: "Usuários bloqueados" }} />
    </Stack.Navigator>
  );
}
