import { Text, View } from "react-native";

import { useTheme } from "../theme";
import { Card, ScreenContainer } from "./ui";

/**
 * Shell reutilizável para as telas que ainda não têm funcionalidade própria
 * nesta fase (Vagas, Mensagens, Notificações, Atividades, Descobrir,
 * Configurações, Acessibilidade, Ajuda, Meu perfil). Existe porque são 8
 * telas com a mesma estrutura (título + descrição, usando o design system) —
 * sem isso, seria a mesma marcação copiada 8 vezes. Cada tela real que vier
 * numa fase futura substitui o próprio arquivo, não estende este componente.
 */
export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  const { theme } = useTheme();

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center", gap: theme.spacing.md }}>
        <Card elevation="md" style={{ gap: theme.spacing.sm }}>
          <Text style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>{title}</Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{description}</Text>
        </Card>
      </View>
    </ScreenContainer>
  );
}
