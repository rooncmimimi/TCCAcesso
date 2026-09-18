import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";

import { useTema } from "../../tema";
import type { Tema } from "../../tema";

export type VarianteBotao = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type TamanhoBotao = "small" | "medium" | "large";

type BotaoProps = {
  children: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: VarianteBotao;
  size?: TamanhoBotao;
  disabled?: boolean;
  carregando?: boolean;
  /** Sobrescreve o rótulo lido pelo TalkBack; por padrão usa o texto visível. */
  accessibilityLabel?: string;
};

/**
 * Botão base do app. Usa `Pressable` (não `TouchableOpacity`) para ter
 * ripple nativo do Android via `android_ripple` e um callback de estilo
 * que reage ao `pressed` sem precisar de estado próprio.
 */
export function Botao({
  children,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  carregando = false,
  accessibilityLabel,
}: BotaoProps) {
  const { tema } = useTema();
  const desabilitado = disabled || carregando;
  const paleta = obterPaleta(tema, variant);
  // Foco de teclado físico, D-pad ou acesso por botão, além do toque. O `Pressable` já dispara
  // `onFocus` e `onBlur` nesses casos.
  const [focado, setFocado] = useState(false);

  const alturaPorTamanho: Record<TamanhoBotao, number> = {
    small: 40,
    medium: tema.sizes.buttonHeight,
    large: 56,
  };

  /**
   * Só `size="small"` (40dp) fica abaixo dos 48dp de alvo de toque do app
   * (`tema.sizes.touchTarget`). A altura visível continua 40, para não inflar layouts apertados, e
   * o `hitSlop` vertical (4 de cada lado) leva a área de toque a 48dp. Só na vertical: a largura de
   * um botão com texto já passa de 48dp.
   */
  const hitSlopPorTamanho: Record<TamanhoBotao, { top: number; bottom: number; left: number; right: number } | undefined> = {
    small: { top: 4, bottom: 4, left: 0, right: 0 },
    medium: undefined,
    large: undefined,
  };

  /**
   * Com `enhancedFocus`, o foco deixa de ser a borda interna e vira um halo por fora do botão. A
   * borda interna ficava entre 1,0:1 e 1,4:1 contra o preenchimento das variantes `primary` e
   * `destructive`, abaixo dos 3:1 do WCAG 1.4.11; o halo contrasta com o fundo da tela e mede entre
   * 3,0:1 e 11,9:1 nos quatro temas. Sem `enhancedFocus`, vale a borda interna.
   */
  const usaHaloExterno = tema.a11y.enhancedFocus;

  const pressable = (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: desabilitado, busy: carregando }}
      android_ripple={{ color: paleta.ripple }}
      hitSlop={hitSlopPorTamanho[size]}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: alturaPorTamanho[size],
          paddingHorizontal: tema.spacing.lg,
          borderRadius: tema.radius.md,
          backgroundColor: paleta.background,
          // Com o halo externo cuidando do foco, a borda interna mantém a aparência normal da
          // variante, para não haver dois indicadores ao mesmo tempo. Sem halo, é ela que muda de
          // cor e espessura ao focar.
          borderWidth: focado && !usaHaloExterno ? tema.a11y.focusRingWidth : paleta.borderWidth,
          borderColor: focado && !usaHaloExterno ? tema.colors.focus : paleta.borderColor,
          opacity: desabilitado ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={paleta.text} />
      ) : (
        <Text style={[tema.typography.button, { color: paleta.text }]}>{children}</Text>
      )}
    </Pressable>
  );

  if (!usaHaloExterno) return pressable;

  return (
    // O espaço do halo (`padding` e `borderWidth`) fica sempre reservado e só a cor muda ao focar.
    // Se a espessura mudasse, o botão mudaria de tamanho a cada Tab e empurraria o que está ao
    // lado. O `borderRadius` soma o raio do botão ao espaço reservado para o anel ficar
    // concêntrico.
    <View
      accessible={false}
      style={{
        borderRadius: tema.radius.md + tema.spacing.xs + tema.a11y.focusRingWidth,
        borderWidth: tema.a11y.focusRingWidth,
        borderColor: focado ? tema.colors.focus : "transparent",
        padding: tema.spacing.xs,
      }}
    >
      {pressable}
    </View>
  );
}

function obterPaleta(tema: Tema, variant: VarianteBotao) {
  switch (variant) {
    case "primary":
      return {
        background: tema.colors.primary.solid,
        text: tema.colors.primary.onSolid,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: "rgba(255,255,255,0.25)",
      };
    case "secondary":
      return {
        background: tema.colors.surfaceElevated,
        text: tema.colors.textPrimary,
        borderWidth: 1,
        borderColor: tema.colors.border,
        ripple: tema.colors.border,
      };
    case "outline":
      return {
        background: "transparent",
        text: tema.colors.primary.solid,
        borderWidth: 1,
        borderColor: tema.colors.primary.solid,
        ripple: tema.colors.primary.soft,
      };
    case "ghost":
      return {
        background: "transparent",
        text: tema.colors.textPrimary,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: tema.colors.divider,
      };
    case "destructive":
      return {
        background: tema.colors.error.solid,
        text: tema.colors.error.onSolid,
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
