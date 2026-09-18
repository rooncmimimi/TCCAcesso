import { ActivityIndicator, Text, View } from "react-native";

import { ContainerTela } from "../components/ui";
import { useTema } from "../tema";

/**
 * Mostrada só enquanto a sessão salva é restaurada (status `carregando` do `AutenticacaoProvider`),
 * para a tela de login não aparecer por um instante antes de entrar ou de descobrir que não há
 * sessão.
 */
export function SplashScreen() {
  const { tema } = useTema();

  return (
    <ContainerTela>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: tema.spacing.md }}>
        <Text style={[tema.typography.display, { color: tema.colors.primary.solid }]}>ACESSO</Text>
        <ActivityIndicator
          size="large"
          color={tema.colors.primary.solid}
          accessibilityLabel="Carregando sua sessão"
        />
      </View>
    </ContainerTela>
  );
}
