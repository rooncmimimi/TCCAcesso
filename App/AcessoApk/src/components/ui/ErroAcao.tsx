import { Text } from "react-native";

import { useTema } from "../../tema";

export function ErroAcao({ mensagem }: { mensagem: string }) {
  const { tema } = useTema();

  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[tema.typography.caption, { color: tema.colors.error.solid }]}
    >
      {mensagem}
    </Text>
  );
}
