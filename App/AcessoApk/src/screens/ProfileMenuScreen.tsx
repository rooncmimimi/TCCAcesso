import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "../auth";
import { Button, Card, Divider, ScreenContainer } from "../components/ui";
import type { ProfileStackParamList } from "../navigation/types";
import { useTheme } from "../theme";

const ITENS_MENU: { label: string; hint: string; screen: keyof ProfileStackParamList }[] = [
  { label: "Meu perfil", hint: "Ver e editar seu perfil", screen: "MyProfile" },
  { label: "Atividades", hint: "Ver seu histórico de atividades", screen: "Activities" },
  { label: "Descobrir", hint: "Encontrar pessoas e empresas no ACESSO", screen: "Discover" },
  { label: "Configurações", hint: "Ajustar as configurações da sua conta", screen: "Settings" },
  { label: "Acessibilidade", hint: "Ajustar preferências de acessibilidade do aplicativo", screen: "Accessibility" },
  { label: "Ajuda", hint: "Ver perguntas frequentes e suporte", screen: "Help" },
];

/**
 * O que a aba "Perfil" mostra por padrão — um menu, não o perfil em si (que
 * é "Meu perfil", um item do menu). "Sair" funciona de verdade, usando o
 * `logout` já existente do `AuthProvider` (Fase 4, item 21) — nenhuma lógica
 * nova de logout foi criada aqui.
 */
export function ProfileMenuScreen() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
        <Card elevation="md" style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
            {user?.nome ?? "Seu perfil"}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>{user?.email}</Text>
        </Card>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          {ITENS_MENU.map((item, indice) => (
            <View key={item.screen}>
              <Pressable
                onPress={() => navigation.navigate(item.screen)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityHint={item.hint}
                android_ripple={{ color: theme.colors.divider }}
                style={{
                  minHeight: theme.sizes.touchTarget,
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]}>{item.label}</Text>
              </Pressable>
              {indice < ITENS_MENU.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>

        <Button variant="destructive" onPress={() => void logout()} accessibilityLabel="Sair da conta">
          Sair
        </Button>
      </ScrollView>
    </ScreenContainer>
  );
}
