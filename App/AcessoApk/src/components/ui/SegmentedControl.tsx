import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../theme";
import type { Theme } from "../../theme";

type Option<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  /** Rótulo do grupo inteiro (ex.: "Tema") — lido pelo TalkBack ao entrar no grupo. */
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  /** Explicação curta opcional, lida em cada opção (ex.: "Aumenta o espaço entre as letras..."). */
  hint?: string;
};

/**
 * Grupo de opções mutuamente exclusivas (Fase 6) — generalizado o bastante
 * para qualquer preferência de poucas opções fixas (tema, escala de fonte,
 * espaçamento), não só acessibilidade; por isso mora em `components/ui/`
 * junto com `Button`/`Input`, não como um componente batizado
 * "AccessibilitySomething". `accessibilityRole="radiogroup"`/`"radio"` diz
 * ao TalkBack que é um grupo de escolha única, com qual opção está
 * selecionada — não um grupo de botões independentes.
 */
export function SegmentedControl<T extends string>({ label, value, onChange, options, hint }: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text
        accessibilityRole="header"
        style={[theme.typography.label, { color: theme.colors.textSecondary }]}
      >
        {label}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
        {options.map((option) => (
          <SegmentOption
            key={option.value}
            theme={theme}
            label={option.label}
            hint={hint}
            selected={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function SegmentOption({
  theme,
  label,
  hint,
  selected,
  onPress,
}: {
  theme: Theme;
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  // Mesmo padrão de foco de `Button`/`Input` (Fase 5) — não um sistema à
  // parte: mesmos tokens (`theme.colors.focus`/`theme.a11y.focusRingWidth`).
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ selected, checked: selected }}
      android_ripple={{ color: theme.colors.divider }}
      style={{
        minHeight: theme.sizes.touchTarget,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: focused ? theme.a11y.focusRingWidth : selected ? 2 : 1,
        borderColor: focused ? theme.colors.focus : selected ? theme.colors.primary.solid : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary.soft : theme.colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={[
          theme.typography.bodySmall,
          { color: selected ? theme.colors.primary.onSoft : theme.colors.textPrimary, fontWeight: selected ? "700" : "400" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
