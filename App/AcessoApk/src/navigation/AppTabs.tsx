import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { ComponentProps } from "react";

import { ProfileNavigator } from "./ProfileNavigator";
import { HomeScreen } from "../screens/HomeScreen";
import { JobsScreen } from "../screens/JobsScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { useTheme } from "../theme";
import type { AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();

type NomeIonicon = ComponentProps<typeof Ionicons>["name"];

/**
 * `@expo/vector-icons` não é uma dependência nova de verdade — já faz parte
 * do pacote `expo` que o projeto já usa, então não pesa nada além do que já
 * estava instalado. É a solução mais simples que atende ao pedido da Fase 4
 * (ícones acessíveis e consistentes, substituíveis depois sem refatoração
 * grande — trocar de ícone aqui é só trocar o nome do Ionicon usado).
 */
const ICONES: Record<keyof AppTabParamList, { ativo: NomeIonicon; inativo: NomeIonicon }> = {
  Home: { ativo: "home", inativo: "home-outline" },
  Jobs: { ativo: "briefcase", inativo: "briefcase-outline" },
  Messages: { ativo: "chatbubbles", inativo: "chatbubbles-outline" },
  Notifications: { ativo: "notifications", inativo: "notifications-outline" },
  Profile: { ativo: "person", inativo: "person-outline" },
};

/**
 * As cinco abas principais do app autenticado (Fase 4, item 14). Cada uma é
 * só o shell desta fase — a única exceção é "Perfil", que renderiza um
 * Stack próprio (`ProfileNavigator`) em vez de uma tela única.
 */
export function AppTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary.solid,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarIcon: ({ color, size, focused }) => {
          const nomes = ICONES[route.name];
          return <Ionicons name={focused ? nomes.ativo : nomes.inativo} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Início", tabBarAccessibilityLabel: "Página inicial" }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{ tabBarLabel: "Vagas", tabBarAccessibilityLabel: "Vagas" }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarLabel: "Mensagens", tabBarAccessibilityLabel: "Mensagens" }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: "Notificações", tabBarAccessibilityLabel: "Notificações" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarLabel: "Perfil", tabBarAccessibilityLabel: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
