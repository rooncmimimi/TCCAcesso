import { Text, View } from "react-native";

import { useAuth } from "../auth";
import { Button, Card, ScreenContainer } from "../components/ui";
import { useTheme } from "../theme";

/**
 * Mostrada quando uma conta `administrador` autentica com sucesso no
 * backend. O ACESSO mobile não tem — e não terá nesta fase — nenhuma tela,
 * rota ou menu administrativo (Fase 3, item 15): em vez de deixar essa conta
 * "meio autenticada" dentro de um app que não sabe o que mostrar para ela,
 * a sessão fica bloqueada aqui, com uma explicação clara e uma saída direta.
 */
export function UnsupportedAccountScreen() {
  const { theme } = useTheme();
  const { logout } = useAuth();

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.lg }}>
        <Card elevation="md" style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>
            Este app não é para contas administrativas
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            O aplicativo ACESSO é para candidatos e empresas. Para administrar a plataforma, acesse pelo site do
            ACESSO em um computador.
          </Text>
        </Card>
        <Button variant="secondary" onPress={() => void logout()}>
          Sair
        </Button>
      </View>
    </ScreenContainer>
  );
}
