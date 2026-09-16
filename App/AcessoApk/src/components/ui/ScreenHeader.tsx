import type { ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Elemento à direita (ex.: "marcar todas como lidas") — nunca outro título, só uma ação secundária. */
  action?: ReactNode;
  /**
   * `"brand"` é só para a saudação pessoal do Feed ("Olá, Nome!") — a única
   * tela com identidade própria o bastante para isso (item 6 do redesign:
   * "saudação"). Todo outro título de aba é neutro (`"default"`).
   */
  tone?: "default" | "brand";
  /** Só para espaçamento externo (`marginBottom`/`marginTop`) — ver o comentário sobre `gap` abaixo. */
  style?: ViewStyle;
};

/**
 * Título consistente para as 5 abas principais (redesign visual, item 12:
 * "evitar headers diferentes em cada tela sem justificativa"). As abas usam
 * `headerShown: false` no `AppTabs.tsx` — sem isto, só o Feed tinha algum
 * tipo de identidade de página ("Olá, Nome!"); Vagas, Mensagens e
 * Notificações iam direto para busca/lista/ações, sem nenhum título.
 * Telas empilhadas (detalhe de vaga, configurações...) continuam usando o
 * header nativo do React Navigation, já consistente entre si — este
 * componente é só para as 5 abas raiz.
 */
export function ScreenHeader({ title, subtitle, action, tone = "default", style }: ScreenHeaderProps) {
  const { theme } = useTheme();

  return (
    // Sem `marginBottom` FIXO de propósito — cada tela que usa isto já
    // gerencia o espaçamento entre seções de um jeito diferente (`gap` do
    // container pai no Feed; direto como primeiro filho em Mensagens/
    // Notificações), então o espaçamento externo vem de `style` (opcional),
    // nunca embutido aqui — evita dobrar o espaço quando o pai já reserva
    // `gap` (caso do `HomeScreen`).
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Fase 10.1 (auditoria final) — achado real: faltava `accessibilityRole="header"`
            aqui, diferente de todo outro título de seção do app (`SectionHeader` em
            `MyProfileScreen.tsx`/`SettingsScreen.tsx`, `Secao` em `ActivitiesScreen.tsx`...).
            Sem isto, o título da tela ficava invisível para a navegação por
            cabeçalhos do TalkBack/VoiceOver nas 4 abas que usam este componente. */}
        <Text
          accessibilityRole="header"
          style={[
            theme.typography.heading,
            { color: tone === "brand" ? theme.colors.primary.solid : theme.colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted, marginTop: 2 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
