import { forwardRef, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useTema } from "../../tema";

type CampoTextoProps = TextInputProps & {
  rotulo?: string;
  erro?: string;
  textoAjuda?: string;
};

/**
 * Campo de entrada base. Usa `minHeight`, nunca `height` fixo, para texto digitado ou fonte do
 * sistema aumentada não serem cortados. Repassa a `ref` ao `TextInput`, para as telas moverem o
 * foco ao próximo campo com o "Próximo" do teclado.
 */
export const CampoTexto = forwardRef<TextInput, CampoTextoProps>(function CampoTexto(
  { rotulo, erro, textoAjuda, editable = true, style, onFocus, onBlur, accessibilityLabel, ...rest },
  ref,
) {
  const { tema } = useTema();
  const [focado, setFocado] = useState(false);
  const temErro = Boolean(erro);

  // Cor e espessura do anel de foco vêm dos tokens `tema.colors.focus` e
  // `tema.a11y.focusRingWidth`, que fica mais espesso com `enhancedFocus`.
  const corBorda = temErro ? tema.colors.error.solid : focado ? tema.colors.focus : tema.colors.border;
  const borderWidth = temErro ? 2 : focado ? tema.a11y.focusRingWidth : 1;

  return (
    <View style={{ gap: tema.spacing.xs }}>
      {rotulo ? (
        <Text style={[tema.typography.label, { color: tema.colors.textSecondary }]}>{rotulo}</Text>
      ) : null}

      <TextInput
        ref={ref}
        {...rest}
        editable={editable}
        onFocus={(event) => {
          setFocado(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocado(false);
          onBlur?.(event);
        }}
        accessibilityLabel={accessibilityLabel ?? rotulo}
        accessibilityState={{ disabled: !editable }}
        placeholderTextColor={tema.colors.textMuted}
        style={[
          tema.typography.body,
          {
            minHeight: tema.sizes.inputHeight,
            borderWidth,
            borderColor: corBorda,
            borderRadius: tema.radius.md,
            paddingHorizontal: tema.spacing.md,
            color: editable ? tema.colors.textPrimary : tema.colors.disabledText,
            backgroundColor: editable ? tema.colors.surface : tema.colors.disabled,
          },
          style,
        ]}
      />

      {erro ? (
        // No Android é o `accessibilityLiveRegion="assertive"` que faz o TalkBack anunciar o erro
        // quando ele aparece; `accessibilityRole="alert"` sozinho só marca o papel do elemento.
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[tema.typography.caption, { color: tema.colors.error.solid }]}
        >
          {erro}
        </Text>
      ) : textoAjuda ? (
        <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{textoAjuda}</Text>
      ) : null}
    </View>
  );
});
