import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import { useTema } from "../../tema";

type CabecalhoSecaoProps = {
  titulo: string;
  icone?: ComponentProps<typeof Ionicons>["name"];
};

export function CabecalhoSecao({ titulo, icone }: CabecalhoSecaoProps) {
  const { tema } = useTema();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.xs }}>
      {icone ? <Ionicons name={icone} size={tema.sizes.iconSmall} color={tema.colors.textSecondary} /> : null}
      <Text accessibilityRole="header" style={[tema.typography.title, { color: tema.colors.textPrimary }]}>
        {titulo}
      </Text>
    </View>
  );
}
