import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTema } from "../../tema";
import type { Tema } from "../../tema";

type Opcao<T extends string> = { rotulo: string; value: T };

type ControleSegmentadoProps<T extends string> = {
  /** Rótulo do grupo inteiro (ex.: "Tema"), lido pelo TalkBack ao entrar no grupo. */
  rotulo: string;
  value: T;
  onChange: (value: T) => void;
  opcoes: Opcao<T>[];
  /** Explicação curta opcional, lida em cada opção (ex.: "Aumenta o espaço entre as letras..."). */
  dica?: string;
};

/**
 * Grupo de opções exclusivas para qualquer preferência com poucas opções fixas (tema, escala de
 * fonte, espaçamento). `accessibilityRole="radiogroup"` e `"radio"` avisam o TalkBack que é uma
 * escolha única e qual opção está marcada.
 */
export function ControleSegmentado<T extends string>({ rotulo, value, onChange, opcoes, dica }: ControleSegmentadoProps<T>) {
  const { tema } = useTema();

  return (
    <View style={{ gap: tema.spacing.xs }}>
      <Text
        accessibilityRole="header"
        style={[tema.typography.label, { color: tema.colors.textSecondary }]}
      >
        {rotulo}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={rotulo} style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.xs }}>
        {opcoes.map((option) => (
          <BotaoOpcao
            key={option.value}
            tema={tema}
            rotulo={option.rotulo}
            dica={dica}
            selecionado={option.value === value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

function BotaoOpcao({
  tema,
  rotulo,
  dica,
  selecionado,
  onPress,
}: {
  tema: Tema;
  rotulo: string;
  dica?: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  // Mesmo foco de `Botao` e `CampoTexto`, com os tokens `tema.colors.focus` e
  // `tema.a11y.focusRingWidth`.
  const [focado, setFocado] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityHint={dica}
      accessibilityState={{ selected: selecionado, checked: selecionado }}
      android_ripple={{ color: tema.colors.divider }}
      style={{
        minHeight: tema.sizes.touchTarget,
        paddingHorizontal: tema.spacing.md,
        borderRadius: tema.radius.md,
        borderWidth: focado ? tema.a11y.focusRingWidth : selecionado ? 2 : 1,
        borderColor: focado ? tema.colors.focus : selecionado ? tema.colors.primary.solid : tema.colors.border,
        backgroundColor: selecionado ? tema.colors.primary.soft : tema.colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={[
          tema.typography.bodySmall,
          { color: selecionado ? tema.colors.primary.onSoft : tema.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
        ]}
      >
        {rotulo}
      </Text>
    </Pressable>
  );
}
