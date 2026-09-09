import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../theme";

/**
 * Container padrão de tela — fundo, área segura e padding horizontal
 * comuns. Não implementa navegação nenhuma.
 *
 * Usa o `SafeAreaView` de `react-native-safe-area-context` (Fase 4) — o
 * `SafeAreaView` do próprio `react-native`, usado até a Fase 3, está
 * depreciado (warning visível nos testes daquela fase) e só respeitava a
 * área segura no iOS. A troca virou obrigatória de qualquer forma nesta
 * fase: `react-native-screens`/`@react-navigation/native-stack` já exigem
 * `react-native-safe-area-context` como dependência, então não é uma
 * dependência nova só para isto — e agora o Android também é coberto
 * corretamente (notch, gesture bar).
 */
export function ScreenContainer({ style, children, ...rest }: ViewProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[{ flex: 1, paddingHorizontal: theme.spacing.md }, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}
