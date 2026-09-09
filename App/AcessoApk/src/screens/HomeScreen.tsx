import { Text, View } from "react-native";

import { useAuth } from "../auth";
import { Card, ScreenContainer } from "../components/ui";
import { useTheme } from "../theme";

/**
 * Shell da aba Home — o feed em si é de uma fase futura (Fase 4, item 15).
 *
 * Antes da Fase 4, este arquivo era o placeholder pós-login da Fase 3 (com
 * um botão de sair, criado só para provar que a sessão autenticada
 * funcionava de ponta a ponta). Esse papel já foi cumprido; "Sair" agora
 * mora no menu do Perfil (`ProfileMenuScreen`), como pede a Fase 4 —
 * mantê-lo também aqui seria duplicar a mesma ação em dois lugares.
 */
export function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <ScreenContainer>
      <View style={{ flex: 1, gap: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
        <Text style={[theme.typography.display, { color: theme.colors.primary.solid }]}>
          Olá, {user?.nome ?? "tudo bem"}!
        </Text>

        <Card elevation="md" style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Em breve</Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            Aqui ficará o feed do ACESSO.
          </Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}
