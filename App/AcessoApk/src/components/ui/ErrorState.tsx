import { Text, View } from "react-native";

import { useTheme } from "../../theme";
import { Button } from "./Button";
import { Card } from "./Card";
import { ScreenContainer } from "./ScreenContainer";

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry: () => void;
  /** Algumas telas (ex.: `JobsScreen`) mantêm este card visível durante a
   * nova tentativa (o botão gira, em vez de trocar para `LoadingState`) —
   * outras (ex.: `MyProfileScreen`) simplesmente refazem a busca e a própria
   * tela troca para `LoadingState` no próximo render. Omitir esta prop
   * reproduz o segundo caso (padrão mais comum); passar `retrying` reproduz
   * o primeiro. */
  retrying?: boolean;
};

/**
 * Erro de tela inteira, no primeiro carregamento (redesign visual, Bloco 8 —
 * "Estados globais") — substitui as ~19 cópias quase idênticas deste card
 * (`ScreenContainer` + card centralizado + título + mensagem + "Tentar
 * novamente"), uma por tela (`MyProfileScreen`, `JobsScreen`, `HomeScreen`,
 * `SettingsScreen`...). Erros de uma ação secundária (ex.: próxima página,
 * salvar um campo) continuam com seu próprio tratamento inline — este
 * componente é só para quando a tela inteira não tem nenhum conteúdo ainda.
 */
export function ErrorState({ title, message, onRetry, retrying = false }: ErrorStateProps) {
  const { theme } = useTheme();

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Card elevation="md" style={{ gap: theme.spacing.sm }}>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[theme.typography.title, { color: theme.colors.textPrimary }]}
          >
            {title}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{message}</Text>
          <Button onPress={onRetry} loading={retrying} disabled={retrying}>
            Tentar novamente
          </Button>
        </Card>
      </View>
    </ScreenContainer>
  );
}
