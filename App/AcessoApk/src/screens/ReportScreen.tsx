import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { announceForAccessibility } from "../accessibility";
import { Button, Card, Input, ScreenContainer } from "../components/ui";
import { MOTIVO_DENUNCIA_LABEL, ModeracaoService } from "../moderacao";
import type { MotivoDenuncia } from "../moderacao";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const OPCOES_MOTIVO = Object.keys(MOTIVO_DENUNCIA_LABEL) as MotivoDenuncia[];

type ReportScreenProps = NativeStackScreenProps<AppStackParamList, "Report">;

/**
 * Denunciar (Fase 19) — uma tela genérica reaproveitada por qualquer
 * superfície do app (perfil, publicação, comentário, vaga): recebe
 * `entidadeTipo`/`entidadeId` por parâmetro de navegação, nunca decide isso
 * sozinha. Mesmo padrão de "composição que fecha a tela inteira ao
 * terminar" de `NovaPostagemScreen.tsx` (Fase 10) — sucesso usa
 * `announceForAccessibility` + `goBack`, não uma live region (a árvore
 * inteira desmonta).
 *
 * O motivo é escolhido por uma lista de rádios própria, não o
 * `SegmentedControl` já existente — este é obrigatório, mas SEM valor
 * inicial (`SegmentedControl` exige `value: T`, sempre uma das opções; não
 * há como representar "nada escolhido ainda" nele sem fingir uma opção
 * pré-selecionada, o que aqui seria enganoso).
 */
export function ReportScreen({ route, navigation }: ReportScreenProps) {
  const { theme } = useTheme();
  const { entidadeTipo, entidadeId, tituloAlvo } = route.params;

  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    if (!motivo || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await ModeracaoService.denunciar({ entidadeTipo, entidadeId, motivo, descricao: descricao.trim() || undefined });
      announceForAccessibility("Denúncia enviada. Nossa equipe vai analisar.");
      navigation.goBack();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível enviar a denúncia agora."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg }}>
        <Card elevation="sm" style={{ gap: theme.spacing.md }}>
          {tituloAlvo ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]} numberOfLines={2}>
              Você está denunciando: {tituloAlvo}
            </Text>
          ) : null}

          <View style={{ gap: theme.spacing.xs }}>
            <Text accessibilityRole="header" style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Motivo da denúncia
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Motivo da denúncia" style={{ gap: theme.spacing.xs }}>
              {OPCOES_MOTIVO.map((valor) => (
                <MotivoOpcao
                  key={valor}
                  label={MOTIVO_DENUNCIA_LABEL[valor]}
                  selecionado={motivo === valor}
                  onPress={() => setMotivo(valor)}
                  theme={theme}
                />
              ))}
            </View>
          </View>

          <Input
            label="Descrição (opcional)"
            value={descricao}
            onChangeText={setDescricao}
            editable={!enviando}
            multiline
            style={{ minHeight: 96, textAlignVertical: "top" }}
            helperText="Até 1000 caracteres. Conte mais detalhes, se quiser."
          />

          {erro ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
              {erro}
            </Text>
          ) : null}

          <Button variant="destructive" onPress={() => void enviar()} loading={enviando} disabled={enviando || !motivo}>
            Enviar denúncia
          </Button>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

/** Função local, não exportada — só `ReportScreen` consome. */
function MotivoOpcao({ label, selecionado, onPress, theme }: { label: string; selecionado: boolean; onPress: () => void; theme: Theme }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: selecionado, checked: selecionado }}
      android_ripple={{ color: theme.colors.divider }}
      style={{
        minHeight: theme.sizes.touchTarget,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: selecionado ? 2 : 1,
        borderColor: selecionado ? theme.colors.primary.solid : theme.colors.border,
        backgroundColor: selecionado ? theme.colors.primary.soft : theme.colors.surface,
        justifyContent: "center",
      }}
    >
      <Text
        style={[
          theme.typography.body,
          { color: selecionado ? theme.colors.primary.onSoft : theme.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
