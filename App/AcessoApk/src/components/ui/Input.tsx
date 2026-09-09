import { forwardRef, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "../../theme";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
};

/**
 * Campo de entrada base. Usa `minHeight` (nunca `height` fixo) para textos
 * digitados ou rótulos maiores (fonte do sistema aumentada) não cortarem.
 *
 * Encaminha `ref` para o `TextInput` interno (adicionado na Fase 3) — sem
 * isso, uma tela com vários campos não consegue mover o foco de um campo
 * para o próximo ao apertar "Próximo" no teclado. Não muda nenhum
 * comportamento existente: quem não passa `ref` não percebe diferença.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helperText, editable = true, style, onFocus, onBlur, accessibilityLabel, ...rest },
  ref,
) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  // Cor e espessura do anel de foco vêm de tokens dedicados (não de
  // `primary.solid` como antes da Fase 5) — `theme.colors.focus` pode
  // divergir de `primary` no futuro sem tocar aqui, e `focusRingWidth`
  // fica mais espesso quando `enhancedFocus` está ativo.
  const borderColor = hasError ? theme.colors.error.solid : focused ? theme.colors.focus : theme.colors.border;
  const borderWidth = hasError ? 2 : focused ? theme.a11y.focusRingWidth : 1;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      ) : null}

      <TextInput
        ref={ref}
        {...rest}
        editable={editable}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          theme.typography.body,
          {
            minHeight: theme.sizes.inputHeight,
            borderWidth,
            borderColor,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            color: editable ? theme.colors.textPrimary : theme.colors.disabledText,
            backgroundColor: editable ? theme.colors.surface : theme.colors.disabled,
          },
          style,
        ]}
      />

      {error ? (
        // `accessibilityLiveRegion="assertive"` (Android) é o que de fato
        // faz o TalkBack anunciar sozinho quando este texto aparece/muda —
        // `accessibilityRole="alert"` sozinho (o que já existia antes da
        // Fase 5) marca o papel semântico do elemento, mas não garante o
        // anúncio automático no Android.
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[theme.typography.caption, { color: theme.colors.error.solid }]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
});
