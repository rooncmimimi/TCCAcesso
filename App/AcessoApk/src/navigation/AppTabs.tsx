import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useState, type ComponentProps } from "react";
import { View } from "react-native";

import { ProfileNavigator } from "./ProfileNavigator";
import { HomeScreen } from "../screens/HomeScreen";
import { JobsScreen } from "../screens/JobsScreen";
import { MessagesScreen } from "../screens/MessagesScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { NotificacaoService } from "../notificacoes";
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
  // Selo (badge) de não lidas na aba (Fase 16). Sem tempo real/polling aqui
  // (Socket.IO fica para uma fase futura, mesmo raciocínio já usado no
  // Feed) — só recalcula ao montar e sempre que a própria aba de
  // Notificações ganha ou perde foco, que é quando o número pode ter
  // mudado de verdade (usuário leu algo, ou algo novo pode ter chegado).
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function buscarNaoLidas() {
      try {
        const total = await NotificacaoService.contarNaoLidas();
        if (!cancelado) setNaoLidas(total);
      } catch {
        // O selo é só um indicador secundário — uma falha aqui não deve
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

  // Mesmo raciocínio de `AppNavigator.tsx`/`ProfileNavigator.tsx` (Rodada 3,
  // item 13): o rótulo da tab bar é renderizado internamente por
  // `@react-navigation/bottom-tabs` com sua própria fonte padrão da
  // plataforma (`fonts.regular`/`fonts.medium` do pacote, não
  // `theme.typography`) — sem isto, seria mais um lugar onde a preferência
  // `dyslexiaFont` fica sem efeito. Só `fontFamily`, mesmo motivo das outras
  // duas correções: a tab bar tem altura fixa, escalar tamanho/altura de
  // linha aqui não foi validado em dispositivo real.
  const tabBarLabelStyle = theme.typography.label.fontFamily
    ? { fontFamily: theme.typography.label.fontFamily }
    : undefined;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary.solid,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarLabelStyle,
        tabBarIcon: ({ color, size, focused }) => {
          const nomes = ICONES[route.name];
          // Indicador visual da aba ativa (redesign visual, item 11) — além
          // da troca de ícone preenchido/contorno e cor que já existia, uma
          // "cápsula" sutil atrás do ícone (mesmo tom de `primary.soft` já
          // usado em badges/chips no resto do app, nunca uma cor nova).
          // Sem animação de propósito: é uma troca binária de fundo, não um
          // movimento — nada aqui para `reduceMotion` precisar desligar.
          //
          // Bloco 9 (auditoria de contraste pós-redesign) — achado real: o
          // ícone ativo usava `color` (= `tabBarActiveTintColor` =
          // `primary.solid`), pensado para ficar sobre a superfície lisa da
          // tab bar. Sobre a NOVA cápsula `primary.soft`, essa combinação
          // mede só 2.66:1 no tema claro (abaixo do mínimo de 3:1 do WCAG
          // 1.4.11 para componentes gráficos) — a cápsula é fundo `soft`,
          // então o ícone sobre ela precisa do par certo, `onSoft` (o mesmo
          // token que `Badge`/`Avatar` já usam sobre `soft`, verificado
          // ≥4.5:1 nos 4 temas por `contrast.test.ts`). O rótulo de texto
          // (`tabBarActiveTintColor`) continua com `primary.solid`, sem
          // mudança — ele fica sobre a superfície lisa da tab bar, não sobre
          // a cápsula.
          return (
            <View
              style={{
                width: size + theme.spacing.md,
                height: size + theme.spacing.xs,
                borderRadius: theme.radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? theme.colors.primary.soft : "transparent",
              }}
            >
              <Ionicons
                name={focused ? nomes.ativo : nomes.inativo}
                size={size}
                color={focused ? theme.colors.primary.onSoft : color}
              />
            </View>
          );
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
        options={{
          tabBarLabel: "Notificações",
          tabBarAccessibilityLabel: "Notificações",
          tabBarBadge: naoLidas > 0 ? naoLidas : undefined,
        }}
        listeners={{ focus: recalcularNaoLidas, blur: recalcularNaoLidas }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarLabel: "Perfil", tabBarAccessibilityLabel: "Perfil" }}
      />
    </Tab.Navigator>
  );
}
