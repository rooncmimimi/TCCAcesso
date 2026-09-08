import { Text, View } from "react-native";

import { useTheme } from "../../theme";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

type BadgeProps = {
  children: string;
  variant?: BadgeVariant;
};

/** Indicador pequeno de estado — sempre usa o par soft/onSoft do token,
 * nunca a cor sólida como fundo (ficaria forte demais para um rótulo). */
export function Badge({ children, variant = "neutral" }: BadgeProps) {
  const { theme } = useTheme();

  const palette =
    variant === "neutral"
      ? { background: theme.colors.divider, text: theme.colors.textSecondary }
      : { background: theme.colors[variant].soft, text: theme.colors[variant].onSoft };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: palette.background,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
      }}
    >
      <Text
        accessibilityRole="text"
        style={[theme.typography.caption, { color: palette.text, fontWeight: "700" }]}
      >
        {children}
      </Text>
    </View>
  );
}
