import { ActivityIndicator, Text, View } from "react-native";

import { ScreenContainer } from "../components/ui";
import { useTheme } from "../theme";

/**
 * Mostrada só durante a restauração inicial da sessão salva (status
 * `loading` do `AuthProvider`) — nunca a tela de login "piscando" antes de
 * entrar direto, nem a tela de login "piscando" antes de descobrir que não
 * há sessão (Fase 3, item 13).
 */
export function SplashScreen() {
  const { theme } = useTheme();

  return (
    <ScreenContainer>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md }}>
        <Text style={[theme.typography.display, { color: theme.colors.primary.solid }]}>ACESSO</Text>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary.solid}
          accessibilityLabel="Carregando sua sessão"
        />
      </View>
    </ScreenContainer>
  );
}
