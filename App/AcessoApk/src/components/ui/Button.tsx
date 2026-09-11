import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { useTheme } from "../../theme";
import type { Theme } from "../../theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "small" | "medium" | "large";

type ButtonProps = {
  children: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Sobrescreve o rótulo lido pelo TalkBack — por padrão usa o texto visível. */
  accessibilityLabel?: string;
};

/**
 * Botão base do app. Usa `Pressable` (não `TouchableOpacity`) para ter
 * ripple nativo do Android via `android_ripple` e um callback de estilo
 * que reage ao `pressed` sem precisar de estado próprio.
 */
export function Button({
  children,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  const palette = getPalette(theme, variant);
  // Foco real (teclado físico, D-pad, switch access — Fase 5, itens 25/27),
  // não só o `pressed` de toque que já existia. `Pressable` dispara
  // `onFocus`/`onBlur` para esses dispositivos assistivos mesmo sem nenhuma
  // dependência nova.
  const [focused, setFocused] = useState(false);

  const heightBySize: Record<ButtonSize, number> = {
    small: 40,
    medium: theme.sizes.buttonHeight,
    large: 56,
  };

  /**
   * Rodada 2 (auditoria de acessibilidade) — só `size="small"` (40dp) fica
   * abaixo do padrão de 48dp do app (`theme.sizes.touchTarget`);
   * `medium`/`large` já atingem ou excedem. Mesma técnica já usada em vários
   * pontos do app para controles pequenos (ex.: "Mostrar senha" em
   * `LoginScreen.tsx`, "×" de habilidade em `MyProfileScreen.tsx`): a altura
   * VISÍVEL continua 40 — não infla o layout de quem já escolheu "small" por
   * causa de espaço apertado (ex.: botões de paginação lado a lado) — mas a
   * área de TOQUE aceita cresce para 48dp via `hitSlop` vertical (4 de cada
   * lado). Só vertical: a largura de um botão com texto real já é bem maior
   * que 48dp, então a altura (40dp) era a única dimensão deficiente. Usado
   * em 18 telas — corrigir aqui, uma vez só, corrige todas de uma vez.
   */
  const hitSlopPorTamanho: Record<ButtonSize, { top: number; bottom: number; left: number; right: number } | undefined> = {
    small: { top: 4, bottom: 4, left: 0, right: 0 },
    medium: undefined,
    large: undefined,
  };

  /**
   * Fase 8: com `enhancedFocus`, o indicador de foco deixa de ser a borda
   * DENTRO do botão. Medido (fórmula de contraste do WCAG): essa borda
   * interna tinha só ~1.0-1.4:1 contra o preenchimento de `primary`/
   * `destructive` (achado da Fase 7) — abaixo do 3:1 do WCAG 1.4.11, porque
   * qualquer cor de contorno fica com contraste de LUMINÂNCIA baixo perto de
   * um preenchimento da mesma família tonal. A troca é um halo por FORA do
   * botão, que contrasta com o fundo da TELA (não com o preenchimento do
   * botão) — medido entre 3.0:1 e 11.9:1 nos 4 temas (claro/escuro/alto
   * contraste claro/alto contraste escuro), sempre acima do mínimo.
   *
   * Sem `enhancedFocus`, nada muda: mesma borda interna de sempre.
   */
  const usaHaloExterno = theme.a11y.enhancedFocus;

  const pressable = (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: palette.ripple }}
      hitSlop={hitSlopPorTamanho[size]}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: heightBySize[size],
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: palette.background,
          // Enquanto o halo externo cuida do foco (usaHaloExterno), a borda
          // interna fica sempre na aparência normal da variante — evita dois
          // indicadores de foco ao mesmo tempo. Só quando NÃO há halo é que
          // ela troca de cor/espessura ao focar, do jeito que já era.
          borderWidth: focused && !usaHaloExterno ? theme.a11y.focusRingWidth : palette.borderWidth,
          borderColor: focused && !usaHaloExterno ? theme.colors.focus : palette.borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[theme.typography.button, { color: palette.text }]}>{children}</Text>
      )}
    </Pressable>
  );

  if (!usaHaloExterno) return pressable;

  return (
    // O espaço do halo (`padding` + `borderWidth`) fica RESERVADO sempre —
    // só a COR muda entre "transparent" e `theme.colors.focus` ao focar/
    // desfocar. Se a largura da borda mudasse em vez da cor, o botão
    // "pularia" de tamanho a cada Tab, deslocando o que está ao lado —
    // exatamente o que o item 6 da Fase 8 proíbe. `borderRadius` soma o
    // raio do botão ao espaço reservado para o anel ficar concêntrico.
    <View
      accessible={false}
      style={{
        borderRadius: theme.radius.md + theme.spacing.xs + theme.a11y.focusRingWidth,
        borderWidth: theme.a11y.focusRingWidth,
        borderColor: focused ? theme.colors.focus : "transparent",
        padding: theme.spacing.xs,
      }}
    >
      {pressable}
    </View>
  );
}

function getPalette(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return {
        background: theme.colors.primary.solid,
        text: theme.colors.primary.onSolid,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: "rgba(255,255,255,0.25)",
      };
    case "secondary":
      return {
        background: theme.colors.surfaceElevated,
        text: theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ripple: theme.colors.border,
      };
    case "outline":
      return {
        background: "transparent",
        text: theme.colors.primary.solid,
        borderWidth: 1,
        borderColor: theme.colors.primary.solid,
        ripple: theme.colors.primary.soft,
      };
    case "ghost":
      return {
        background: "transparent",
        text: theme.colors.textPrimary,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: theme.colors.divider,
      };
    case "destructive":
      return {
        background: theme.colors.error.solid,
        text: theme.colors.error.onSolid,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: "rgba(255,255,255,0.25)",
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
