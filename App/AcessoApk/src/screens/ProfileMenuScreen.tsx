import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "../auth";
import { Button, Card, Divider, ScreenContainer } from "../components/ui";
import type { ProfileStackParamList } from "../navigation/types";
import { useTheme } from "../theme";

/**
 * Só as telas do menu que não pedem parâmetro nenhum — `JobForm`/
 * `JobApplicants` (Fase 18) exigem `vagaId`, então não fazem sentido aqui
 * (são alcançadas a partir de `MyJobs`, nunca direto do menu).
 */
type TelaDoMenu = "MyProfile" | "Activities" | "Discover" | "Settings" | "Accessibility" | "Help" | "MyJobs";

type ItemMenu = { label: string; hint: string; screen: TelaDoMenu };

const ITENS_MENU_BASE: ItemMenu[] = [
  { label: "Meu perfil", hint: "Ver e editar seu perfil", screen: "MyProfile" },
  { label: "Atividades", hint: "Ver seu histórico de atividades", screen: "Activities" },
  { label: "Descobrir", hint: "Encontrar pessoas e empresas no ACESSO", screen: "Discover" },
  { label: "Configurações", hint: "Ajustar as configurações da sua conta", screen: "Settings" },
  { label: "Acessibilidade", hint: "Ajustar preferências de acessibilidade do aplicativo", screen: "Accessibility" },
  { label: "Ajuda", hint: "Ver perguntas frequentes e suporte", screen: "Help" },
];

/** "Minhas Vagas" (Fase 18) só existe para quem gerencia vagas — o backend também recusa (403) um candidato tentando acessar direto pela API, isto aqui é só a mesma regra refletida no menu. */
const ITEM_MINHAS_VAGAS: ItemMenu = { label: "Minhas Vagas", hint: "Gerenciar as vagas publicadas pela sua empresa", screen: "MyJobs" };

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

  const itensMenu =
    user?.tipoUsuario === "empresa"
      ? [ITENS_MENU_BASE[0], ITEM_MINHAS_VAGAS, ...ITENS_MENU_BASE.slice(1)]
      : ITENS_MENU_BASE;

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
          {itensMenu.map((item, indice) => (
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
              {indice < itensMenu.length - 1 ? <Divider /> : null}
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
