import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../../theme";
import { ScreenContainer } from "./ScreenContainer";

type LoadingStateProps = {
  /** Anunciado por leitores de tela — nenhuma das 19 cópias deste estado
   * (antes desta centralização) tinha isto, diferente de `SplashScreen.tsx`
   * (`"Carregando sua sessão"`), que já estabelecia o padrão certo. */
  label?: string;
};

/**
 * Carregamento de tela inteira (redesign visual, Bloco 8 — "Estados
 * globais") — substitui as ~19 cópias quase idênticas de `ScreenContainer` +
 * `View` centralizada + `ActivityIndicator` espalhadas pelas telas
 * (`MyProfileScreen`, `JobsScreen`, `HomeScreen`, `SettingsScreen`...), todas
 * com o mesmo `justifyContent`/`alignItems`/tamanho/cor. Só para o
 * carregamento INICIAL de uma tela (antes de existir qualquer conteúdo) —
 * carregamentos parciais (ex.: próxima página de uma lista, comentários de
 * uma publicação) continuam com seu próprio indicador inline, menor e sem
 * `ScreenContainer`, que já é o tratamento certo para esses casos.
 */
export function LoadingState({ label = "Carregando" }: LoadingStateProps) {
  const { theme } = useTheme();

  return (
    <ScreenContainer>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.colors.primary.solid} size="large" accessibilityLabel={label} />
      </View>
    </ScreenContainer>
  );
}
