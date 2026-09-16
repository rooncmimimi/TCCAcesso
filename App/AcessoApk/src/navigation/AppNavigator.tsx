import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AppTabs } from "./AppTabs";
import type { AppStackParamList } from "./types";
import { ConversationScreen } from "../screens/ConversationScreen";
import { FollowListScreen } from "../screens/FollowListScreen";
import { NovaPostagemScreen } from "../screens/NovaPostagemScreen";
import { PostagemDetailScreen } from "../screens/PostagemDetailScreen";
import { PublicProfileScreen } from "../screens/PublicProfileScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { SearchResultsScreen, TITULO_TIPO_BUSCA } from "../screens/SearchResultsScreen";
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

  // O título do header nativo (`react-native-screens`) é um componente
  // nativo à parte — não um `<Text>` do próprio app — então NÃO herda
  // `theme.typography` sozinho; sem isto, seria a única exceção ao "ponto
  // único de composição" que `theme/accessibleTheme.ts` documenta, e a
  // preferência `dyslexiaFont` ficaria sem efeito nos títulos de tela em
  // pilha (Rodada 3, item 13). Só `fontFamily` — não `fontSize`/
  // `lineHeight`/`letterSpacing`: a barra do header nativo tem altura fixa
  // da plataforma, escalar o tamanho do texto ali arriscaria cortar o
  // título quando `fontScale`/`lineHeightScale` também estão no máximo, e
  // não há dispositivo real disponível para validar isso nesta rodada —
  // fica registrado como gap pré-existente, não como parte desta correção.
  const headerTitleStyle = theme.typography.title.fontFamily
    ? { fontFamily: theme.typography.title.fontFamily }
    : undefined;

  return (
    // `screenOptions` centraliza o estilo do header (mesmo padrão que
    // `ProfileNavigator.tsx` já usava) — as 7 telas empilhadas abaixo
    // repetiam as MESMAS 4 propriedades (`headerStyle`/`headerTintColor`/
    // `headerTitleStyle`/`headerShadowVisible`) uma a uma; cada `<Stack.
    // Screen>` agora só declara o que é de fato diferente entre elas
    // (`title`, às vezes calculado a partir de `route.params`). `Tabs`
    // continua sem header — só sobrescreve `headerShown: false` no seu
    // próprio `options`.
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="VagaDetail" component={VagaDetailScreen} options={{ title: "Detalhe da vaga" }} />
      <Stack.Screen name="NovaPostagem" component={NovaPostagemScreen} options={{ title: "Nova publicação" }} />
      <Stack.Screen name="PostagemDetail" component={PostagemDetailScreen} options={{ title: "Publicação" }} />
      <Stack.Screen name="PublicProfile" component={PublicProfileScreen} options={{ title: "Perfil" }} />
      <Stack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={({ route }) => ({
          title:
            route.params.modo === "seguidores"
              ? `Seguidores${route.params.nomeUsuario ? ` de ${route.params.nomeUsuario}` : ""}`
              : `Seguindo${route.params.nomeUsuario ? ` — ${route.params.nomeUsuario}` : ""}`,
        })}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({
          // Título inicial vem do param (Fase 17) — a própria tela troca
          // via `navigation.setOptions` se precisar, mesmo mecanismo do
          // header nativo, sem duplicar a lógica de título aqui.
          title: route.params.nomeOutroParticipante || "Conversa",
        })}
      />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: "Denunciar" }} />
      <Stack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={({ route }) => ({ title: TITULO_TIPO_BUSCA[route.params.tipo] })}
      />
    </Stack.Navigator>
  );
}
