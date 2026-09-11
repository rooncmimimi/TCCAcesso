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
import { SearchScreen } from "../screens/SearchScreen";
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

  // Mesmo raciocínio de `AppNavigator.tsx` (Rodada 3, item 13): o título do
  // header nativo não herda `theme.typography` sozinho, então sem isto a
  // preferência `dyslexiaFont` não teria efeito nos títulos deste Stack. Só
  // `fontFamily`, pelo mesmo motivo (altura fixa do header nativo, sem
  // dispositivo real para validar `fontSize`/`lineHeight` maiores ali).
  const headerTitleStyle = theme.typography.title.fontFamily
    ? { fontFamily: theme.typography.title.fontFamily }
    : undefined;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ProfileMenu" component={ProfileMenuScreen} options={{ title: "Perfil" }} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: "Meu perfil" }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ title: "Atividades" }} />
      <Stack.Screen name="Discover" component={DiscoverScreen} options={{ title: "Descobrir" }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Buscar" }} />
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
