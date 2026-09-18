import { View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTema } from "../../tema";

/**
 * Container padrão de tela: fundo, área segura e padding horizontal. Usa o `SafeAreaView` de
 * `react-native-safe-area-context`, que respeita a área segura também no Android (entalhe e barra
 * de gestos); o do `react-native` está descontinuado e só cobria o iOS.
 */
export function ContainerTela({ style, children, ...rest }: ViewProps) {
  const { tema } = useTema();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tema.colors.background }}>
      <View style={[{ flex: 1, paddingHorizontal: tema.spacing.md }, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}
