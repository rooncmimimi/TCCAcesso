import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AbasNavigator } from "./AbasNavigator";
import type { AppStackParamList } from "./types";
import { ConversaScreen } from "../screens/ConversaScreen";
import { ListaSeguidoresScreen } from "../screens/ListaSeguidoresScreen";
import { NovaPostagemScreen } from "../screens/NovaPostagemScreen";
import { DetalhePostagemScreen } from "../screens/DetalhePostagemScreen";
import { PerfilPublicoScreen } from "../screens/PerfilPublicoScreen";
import { DenunciaScreen } from "../screens/DenunciaScreen";
import { ResultadosBuscaScreen, TITULO_TIPO_BUSCA } from "../screens/ResultadosBuscaScreen";
import { DetalheVagaScreen } from "../screens/DetalheVagaScreen";
import { useTema } from "../tema";

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Pilha principal da área logada: as abas (`Tabs`, sem header próprio) e as telas abertas por cima
 * delas, como detalhe de vaga, publicação e conversa, com header nativo e o voltar do Android.
 */
export function AppNavigator() {
  const { tema } = useTema();

  // O título do header nativo (`react-native-screens`) não é um `<Text>` do app, então não herda
  // `tema.typography`; sem isto a fonte para dislexia não chegaria aos títulos. Só a `fontFamily` é
  // aplicada: a barra tem altura fixa, e tamanhos maiores poderiam cortar o título, o que ainda não
  // foi validado em aparelho.
  const headerTitleStyle = tema.typography.title.fontFamily
    ? { fontFamily: tema.typography.title.fontFamily }
    : undefined;

  return (
    // `screenOptions` concentra o estilo do header; cada tela declara só o que muda, normalmente o
    // título, às vezes vindo de `route.params`. `Tabs` desliga o header nas próprias opções.
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: tema.colors.surface },
        headerTintColor: tema.colors.textPrimary,
        headerTitleStyle,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Tabs" component={AbasNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="VagaDetail" component={DetalheVagaScreen} options={{ title: "Detalhe da vaga" }} />
      <Stack.Screen name="NovaPostagem" component={NovaPostagemScreen} options={{ title: "Nova publicação" }} />
      <Stack.Screen name="PostagemDetail" component={DetalhePostagemScreen} options={{ title: "Publicação" }} />
      <Stack.Screen name="PublicProfile" component={PerfilPublicoScreen} options={{ title: "Perfil" }} />
      <Stack.Screen
        name="FollowList"
        component={ListaSeguidoresScreen}
        options={({ route }) => ({
          title:
            route.params.modo === "seguidores"
              ? `Seguidores${route.params.nomeUsuario ? ` de ${route.params.nomeUsuario}` : ""}`
              : `Seguindo${route.params.nomeUsuario ? ` — ${route.params.nomeUsuario}` : ""}`,
        })}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversaScreen}
        options={({ route }) => ({
          // Título inicial vindo do parâmetro; a tela pode trocá-lo depois com
          // `navigation.setOptions`.
          title: route.params.nomeOutroParticipante || "Conversa",
        })}
      />
      <Stack.Screen name="Report" component={DenunciaScreen} options={{ title: "Denunciar" }} />
      <Stack.Screen
        name="SearchResults"
        component={ResultadosBuscaScreen}
        options={({ route }) => ({ title: TITULO_TIPO_BUSCA[route.params.tipo] })}
      />
    </Stack.Navigator>
  );
}
