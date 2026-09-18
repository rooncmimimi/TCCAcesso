import { View, type ViewProps } from "react-native";

import { useTema } from "../../tema";
import type { NivelElevacao } from "../../tema";

type CartaoProps = ViewProps & {
  elevacao?: NivelElevacao;
};

/** Superfície reutilizável, nunca acoplada a uma tela específica. */
export function Cartao({ elevacao = "sm", style, children, ...rest }: CartaoProps) {
  const { tema } = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: tema.colors.surface,
          borderRadius: tema.radius.lg,
          borderWidth: 1,
          borderColor: tema.colors.border,
          padding: tema.spacing.md,
        },
        tema.shadow(elevacao),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
