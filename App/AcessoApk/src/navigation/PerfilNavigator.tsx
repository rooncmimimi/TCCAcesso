import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AcessibilidadeScreen } from "../screens/AcessibilidadeScreen";
import { AtividadesScreen } from "../screens/AtividadesScreen";
import { UsuariosBloqueadosScreen } from "../screens/UsuariosBloqueadosScreen";
import { DescobrirScreen } from "../screens/DescobrirScreen";
import { AjudaScreen } from "../screens/AjudaScreen";
import { CandidaturasVagaScreen } from "../screens/CandidaturasVagaScreen";
import { FormularioVagaScreen } from "../screens/FormularioVagaScreen";
import { MinhasVagasScreen } from "../screens/MinhasVagasScreen";
import { MeuPerfilScreen } from "../screens/MeuPerfilScreen";
import { MenuPerfilScreen } from "../screens/MenuPerfilScreen";
import { BuscaScreen } from "../screens/BuscaScreen";
import { ConfiguracoesScreen } from "../screens/ConfiguracoesScreen";
import { useTema } from "../tema";
import type { PerfilStackParamList } from "./types";

const Stack = createNativeStackNavigator<PerfilStackParamList>();

/**
 * Pilha da aba Perfil: o menu (`ProfileMenu`) é a tela inicial e as demais (Configurações,
 * Acessibilidade, Ajuda...) abrem por cima, com header e voltar nativos, em vez de cada uma virar
 * uma aba.
 */
export function PerfilNavigator() {
  const { tema } = useTema();

  // Mesmo motivo de `AppNavigator.tsx`: o título do header nativo não herda `tema.typography`,
  // então só a `fontFamily` é aplicada aqui.
  const headerTitleStyle = tema.typography.title.fontFamily
    ? { fontFamily: tema.typography.title.fontFamily }
    : undefined;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tema.colors.surface },
        headerTintColor: tema.colors.textPrimary,
        headerTitleStyle,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="ProfileMenu" component={MenuPerfilScreen} options={{ title: "Perfil" }} />
      <Stack.Screen name="MyProfile" component={MeuPerfilScreen} options={{ title: "Meu perfil" }} />
      <Stack.Screen name="Activities" component={AtividadesScreen} options={{ title: "Atividades" }} />
      <Stack.Screen name="Discover" component={DescobrirScreen} options={{ title: "Descobrir" }} />
      <Stack.Screen name="Search" component={BuscaScreen} options={{ title: "Buscar" }} />
      <Stack.Screen name="Settings" component={ConfiguracoesScreen} options={{ title: "Configurações" }} />
      <Stack.Screen name="Accessibility" component={AcessibilidadeScreen} options={{ title: "Acessibilidade" }} />
      <Stack.Screen name="Help" component={AjudaScreen} options={{ title: "Ajuda" }} />
      <Stack.Screen name="MyJobs" component={MinhasVagasScreen} options={{ title: "Minhas Vagas" }} />
      <Stack.Screen
        name="JobForm"
        component={FormularioVagaScreen}
        options={({ route }) => ({ title: route.params.vagaId ? "Editar vaga" : "Nova vaga" })}
      />
      <Stack.Screen
        name="JobApplicants"
        component={CandidaturasVagaScreen}
        options={({ route }) => ({ title: route.params.vagaTitulo || "Candidaturas" })}
      />
      <Stack.Screen name="BlockedUsers" component={UsuariosBloqueadosScreen} options={{ title: "Usuários bloqueados" }} />
    </Stack.Navigator>
  );
}
