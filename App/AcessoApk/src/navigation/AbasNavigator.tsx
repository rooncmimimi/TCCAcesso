import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useState, type ComponentProps } from "react";
import { View } from "react-native";

import { PerfilNavigator } from "./PerfilNavigator";
import { FeedScreen } from "../screens/FeedScreen";
import { VagasScreen } from "../screens/VagasScreen";
import { MensagensScreen } from "../screens/MensagensScreen";
import { NotificacoesScreen } from "../screens/NotificacoesScreen";
import { NotificacaoService } from "../notificacoes";
import { useTema } from "../tema";
import type { AbasParamList } from "./types";

const Tab = createBottomTabNavigator<AbasParamList>();

type NomeIonicon = ComponentProps<typeof Ionicons>["name"];

/**
 * Ícones do `@expo/vector-icons`, que já vem com o pacote `expo`. Trocar o ícone de uma aba é só
 * trocar o nome do Ionicon aqui.
 */
const ICONES: Record<keyof AbasParamList, { ativo: NomeIonicon; inativo: NomeIonicon }> = {
  Home: { ativo: "home", inativo: "home-outline" },
  Jobs: { ativo: "briefcase", inativo: "briefcase-outline" },
  Messages: { ativo: "chatbubbles", inativo: "chatbubbles-outline" },
  Notifications: { ativo: "notifications", inativo: "notifications-outline" },
  Profile: { ativo: "person", inativo: "person-outline" },
};

/**
 * As cinco abas da área logada. "Perfil" é a única que abre uma pilha própria (`PerfilNavigator`)
 * em vez de uma tela única.
 */
export function AbasNavigator() {
  const { tema } = useTema();
  // Selo de notificações não lidas na aba. Não usa tempo real nem polling: recalcula ao montar e
  // quando a aba de Notificações ganha ou perde foco, que é quando o número costuma mudar.
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function buscarNaoLidas() {
      try {
        const total = await NotificacaoService.contarNaoLidas();
        if (!cancelado) setNaoLidas(total);
      } catch {
        // O selo é só um indicador secundário: uma falha aqui não deve
        // aparecer como erro em lugar nenhum, só deixa o número desatualizado.
      }
    }

    void buscarNaoLidas();
    return () => {
      cancelado = true;
    };
  }, []);

  function recalcularNaoLidas() {
    NotificacaoService.contarNaoLidas()
      .then(setNaoLidas)
      .catch(() => {
        // Ver comentário acima.
      });
  }

  // O rótulo da tab bar é desenhado pelo `@react-navigation/bottom-tabs` com a fonte padrão do
  // pacote, não com `tema.typography`; sem isto a fonte para dislexia não chegaria às abas. Só a
  // `fontFamily` é aplicada, porque a barra tem altura fixa e textos maiores ainda não foram
  // validados em aparelho.
  const estiloRotuloAba = tema.typography.label.fontFamily
    ? { fontFamily: tema.typography.label.fontFamily }
    : undefined;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tema.colors.primary.solid,
        tabBarInactiveTintColor: tema.colors.textMuted,
        tabBarStyle: { backgroundColor: tema.colors.surface, borderTopColor: tema.colors.border },
        tabBarLabelStyle: estiloRotuloAba,
        tabBarIcon: ({ color, size, focused: focado }) => {
          const nomes = ICONES[route.name];
          // A aba ativa ganha uma cápsula `primary.soft` atrás do ícone, sem animação (é só uma
          // troca de fundo, nada a desligar com `reduceMotion`).
          //
          // Sobre a cápsula, o ícone usa `primary.onSoft`: `primary.solid` sobre `primary.soft`
          // mede 2,66:1 no tema claro, abaixo dos 3:1 exigidos pelo WCAG 1.4.11. O rótulo continua
          // em `primary.solid`, porque fica sobre a superfície lisa da barra.
          return (
            <View
              style={{
                width: size + tema.spacing.md,
                height: size + tema.spacing.xs,
                borderRadius: tema.radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focado ? tema.colors.primary.soft : "transparent",
              }}
            >
              <Ionicons
                name={focado ? nomes.ativo : nomes.inativo}
                size={size}
                color={focado ? tema.colors.primary.onSoft : color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={FeedScreen}
        options={{ tabBarLabel: "Início", tabBarAccessibilityLabel: "Página inicial" }}
      />
      <Tab.Screen
        name="Jobs"
        component={VagasScreen}
        options={{ tabBarLabel: "Vagas", tabBarAccessibilityLabel: "Vagas" }}
      />
      <Tab.Screen
        name="Messages"
        component={MensagensScreen}
        options={{ tabBarLabel: "Mensagens", tabBarAccessibilityLabel: "Mensagens" }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificacoesScreen}
        options={{
          tabBarLabel: "Notificações",
          tabBarAccessibilityLabel: "Notificações",
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
        listeners={{ focus: recalcularNaoLidas, blur: recalcularNaoLidas }}
      />
      <Tab.Screen
        name="Profile"
        component={PerfilNavigator}
        options={{ tabBarLabel: "Perfil", tabBarAccessibilityLabel: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
