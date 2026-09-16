import { useState } from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { useTheme } from "../../theme";

export type IconButtonVariant = "ghost" | "soft" | "outline";
export type IconButtonSize = "small" | "medium";

type IonIconName = ComponentProps<typeof Ionicons>["name"];

type IconButtonProps = {
  name: IonIconName;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Cor do ícone; por padrão segue a variante (`ghost`/`outline` = texto secundário, `soft` = primária). */
  color?: string;
  disabled?: boolean;
  /** Estado "pressionado" persistente (ex.: favoritado) — diferente de `pressed` do toque em si. */
  active?: boolean;
};

/**
 * Botão de ícone único do app (redesign visual, item 21: "todos os ícones
 * interativos devem possuir área de toque adequada, label acessível, estado
 * pressed"). Antes, cada tela reimplementava `Pressable` + `Ionicons` com
 * tamanho e `hitSlop` diferentes (ex.: menu "mais opções" do feed, favoritar
 * vaga, fechar diálogo) — este componente fixa os dois: a área de toque
 * VISÍVEL pode ser pequena (`small` = 32dp, para caber ao lado de outros
 * elementos), mas o alvo real de toque é sempre >= 48dp via `hitSlop`,
 * nunca aumentando o espaço ocupado no layout.
 */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = "ghost",
  size = "medium",
  color,
  disabled = false,
  active = false,
}: IconButtonProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const visualSize = size === "small" ? 32 : 40;
  const iconSize = size === "small" ? theme.sizes.iconMedium : theme.sizes.iconLarge;
  const hitSlopValue = Math.max(0, Math.ceil((theme.sizes.touchTarget - visualSize) / 2));

  const palette = getPalette(theme, variant, active);
  const iconColor = color ?? palette.icon;
  const usaHaloExterno = theme.a11y.enhancedFocus;

  const pressable = (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active || undefined }}
      android_ripple={{ color: palette.ripple, borderless: true, radius: visualSize / 2 }}
      hitSlop={hitSlopValue}
      style={({ pressed }) => ({
        width: visualSize,
        height: visualSize,
        borderRadius: visualSize / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.background,
        borderWidth: palette.borderWidth,
        borderColor: focused && !usaHaloExterno ? theme.colors.focus : palette.borderColor,
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={name} size={iconSize} color={iconColor} />
    </Pressable>
  );

  if (!usaHaloExterno) return pressable;

  return (
    <View
      accessible={false}
      style={{
        borderRadius: visualSize / 2 + theme.a11y.focusRingWidth + 2,
        borderWidth: theme.a11y.focusRingWidth,
        borderColor: focused ? theme.colors.focus : "transparent",
        padding: 2,
      }}
    >
      {pressable}
    </View>
  );
}

function getPalette(theme: ReturnType<typeof useTheme>["theme"], variant: IconButtonVariant, active: boolean) {
  if (active) {
    return {
      background: theme.colors.primary.soft,
      icon: theme.colors.primary.onSoft,
      borderWidth: 0,
      borderColor: "transparent",
      ripple: theme.colors.primary.soft,
    };
  }
  switch (variant) {
    case "soft":
      return {
        background: theme.colors.divider,
        icon: theme.colors.textSecondary,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: theme.colors.border,
      };
    case "outline":
      return {
        background: "transparent",
        icon: theme.colors.textSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ripple: theme.colors.divider,
      };
    case "ghost":
    default:
      return {
        background: "transparent",
        icon: theme.colors.textSecondary,
        borderWidth: 0,
        borderColor: "transparent",
        ripple: theme.colors.divider,
      };
  }
}
