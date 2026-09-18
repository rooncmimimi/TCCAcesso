import { Text, View } from "react-native";

import { useTema } from "../../tema";

export type VarianteEtiqueta = "success" | "warning" | "error" | "info" | "neutral";

type EtiquetaProps = {
  children: string;
  variant?: VarianteEtiqueta;
};

/** Indicador pequeno de estado: sempre usa o par soft/onSoft do token,
 * nunca a cor sólida como fundo (ficaria forte demais para um rótulo). */
export function Etiqueta({ children, variant = "neutral" }: EtiquetaProps) {
  const { tema } = useTema();

  const paleta =
    variant === "neutral"
      ? { background: tema.colors.divider, text: tema.colors.textSecondary }
      : { background: tema.colors[variant].soft, text: tema.colors[variant].onSoft };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: paleta.background,
        borderRadius: tema.radius.pill,
        paddingHorizontal: tema.spacing.sm,
        paddingVertical: 4,
      }}
    >
      <Text
        accessibilityRole="text"
        style={[tema.typography.caption, { color: paleta.text, fontWeight: "700" }]}
      >
        {children}
      </Text>
    </View>
  );
}
