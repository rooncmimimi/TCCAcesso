import { View, type ViewProps } from "react-native";

import { useTheme } from "../../theme";
import type { ElevationLevel } from "../../theme";

type CardProps = ViewProps & {
  elevation?: ElevationLevel;
};

/** Superfície reutilizável — nunca acoplada a uma tela específica. */
export function Card({ elevation = "sm", style, children, ...rest }: CardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.md,
        },
        theme.shadow(elevation),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
