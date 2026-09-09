import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppTabs } from "./AppTabs";
import type { AppStackParamList } from "./types";
import { ConversationScreen } from "../screens/ConversationScreen";
import { FollowListScreen } from "../screens/FollowListScreen";
import { NovaPostagemScreen } from "../screens/NovaPostagemScreen";
import { PostagemDetailScreen } from "../screens/PostagemDetailScreen";
import { PublicProfileScreen } from "../screens/PublicProfileScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { VagaDetailScreen } from "../screens/VagaDetailScreen";
import { useTheme } from "../theme";

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * `Tabs` continua sem header próprio (cada aba decide sozinha). `VagaDetail`
 * (Fase 9) foi a primeira tela empilhada por cima das tabs — exatamente o
 * que este Stack já existia preparado para receber (comentário das fases
 * anteriores citava literalmente "detalhe de vaga"). `NovaPostagem`/
 * `PostagemDetail` (Fase 10) seguem o mesmo padrão. Todas ganham um header
 * nativo themed igual ao que `ProfileNavigator.tsx` já usa, com "voltar"
 * nativo do Android de graça.
 */
export function AppNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppTabs} />
      <Stack.Screen
        name="VagaDetail"
        component={VagaDetailScreen}
        options={{
          headerShown: true,
          title: "Detalhe da vaga",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="NovaPostagem"
        component={NovaPostagemScreen}
        options={{
          headerShown: true,
          title: "Nova publicação",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="PostagemDetail"
        component={PostagemDetailScreen}
        options={{
          headerShown: true,
          title: "Publicação",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{
          headerShown: true,
          title: "Perfil",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={({ route }) => ({
          headerShown: true,
          title:
            route.params.modo === "seguidores"
              ? `Seguidores${route.params.nomeUsuario ? ` de ${route.params.nomeUsuario}` : ""}`
              : `Seguindo${route.params.nomeUsuario ? ` — ${route.params.nomeUsuario}` : ""}`,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        })}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({
          headerShown: true,
          // Título inicial vem do param (Fase 17) — a própria tela troca
          // via `navigation.setOptions` se precisar, mesmo mecanismo do
          // header nativo, sem duplicar a lógica de título aqui.
          title: route.params.nomeOutroParticipante || "Conversa",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        })}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{
          headerShown: true,
          title: "Denunciar",
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
