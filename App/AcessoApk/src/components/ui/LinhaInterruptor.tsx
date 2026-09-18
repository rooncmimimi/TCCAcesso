import { Switch, Text, View } from "react-native";

import { useTema } from "../../tema";

type LinhaInterruptorProps = {
  rotulo: string;
  descricao?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/**
 * Linha com rótulo, descrição e `Switch`, para qualquer preferência liga/desliga. O `Switch` nativo
 * já faz o TalkBack anunciar "ativado" ou "desativado"; rótulo e descrição são passados à parte
 * porque o `Switch` não sabe qual texto ao lado é o seu.
 */
export function LinhaInterruptor({ rotulo, descricao, value, onValueChange }: LinhaInterruptorProps) {
  const { tema } = useTema();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: tema.spacing.md,
        minHeight: tema.sizes.touchTarget,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]}>{rotulo}</Text>
        {descricao ? (
          <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{descricao}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={rotulo}
        accessibilityHint={descricao}
        trackColor={{ false: tema.colors.border, true: tema.colors.primary.soft }}
        thumbColor={value ? tema.colors.primary.solid : tema.colors.surfaceElevated}
      />
    </View>
  );
}
