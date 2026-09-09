import { Switch, Text, View } from "react-native";

import { useTheme } from "../../theme";

type ToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * Linha "rótulo + descrição + Switch" (Fase 6) — genérica o bastante para
 * qualquer preferência liga/desliga com explicação, não só acessibilidade.
 * Usa o `Switch` do próprio `react-native` (nenhuma dependência nova,
 * nenhum "AccessibilitySwitch" reinventado): já é um controle nativo do
 * Android, então o TalkBack já anuncia "ativado"/"desativado" sozinho —
 * só o rótulo/descrição precisam ser passados explicitamente, porque o
 * `Switch` sozinho não sabe qual texto ao lado é o seu rótulo.
 */
export function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        minHeight: theme.sizes.touchTarget,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]}>{label}</Text>
        {description ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary.soft }}
        thumbColor={value ? theme.colors.primary.solid : theme.colors.surfaceElevated}
      />
    </View>
  );
}
