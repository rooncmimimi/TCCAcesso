import type { ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";

import { useTema } from "../../tema";

type CabecalhoTelaProps = {
  titulo: string;
  subtitulo?: string;
  /** Elemento à direita (ex.: "marcar todas como lidas"); nunca outro título, só uma ação secundária. */
  acao?: ReactNode;
  /**
   * `"brand"` só para a saudação do feed ("Olá, Nome!"); os demais títulos de aba usam `"default"`.
   */
  tone?: "default" | "brand";
  /** Só para espaçamento externo (`marginBottom`, `marginTop`); veja o comentário sobre `gap` abaixo. */
  style?: ViewStyle;
};

/**
 * Título das abas principais, que não usam o header nativo (`headerShown: false` em
 * `AbasNavigator.tsx`). Telas empilhadas, como detalhe de vaga e configurações, continuam com o
 * header do React Navigation.
 */
export function CabecalhoTela({ titulo, subtitulo, acao, tone = "default", style }: CabecalhoTelaProps) {
  const { tema } = useTema();

  return (
    // Sem `marginBottom` fixo de propósito: cada tela que usa isto já
    // gerencia o espaçamento entre seções de um jeito diferente (`gap` do
    // container pai no Feed; direto como primeiro filho em Mensagens/
    // Notificações), então o espaçamento externo vem de `style` (opcional),
    // nunca embutido aqui, o que evita dobrar o espaço quando o pai já reserva
    // `gap` (caso do `FeedScreen`).
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: tema.spacing.sm,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* `accessibilityRole="header"` coloca o título na navegação por cabeçalhos do TalkBack
            e do VoiceOver, como os demais títulos de seção do app. */}
        <Text
          accessibilityRole="header"
          style={[
            tema.typography.heading,
            { color: tone === "brand" ? tema.colors.primary.solid : tema.colors.textPrimary },
          ]}
        >
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted, marginTop: 2 }]}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {acao}
    </View>
  );
}
