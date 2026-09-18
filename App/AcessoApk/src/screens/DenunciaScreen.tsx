import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { anunciarParaLeitorDeTela } from "../acessibilidade";
import { Botao, Cartao, CampoTexto, ContainerTela } from "../components/ui";
import { ROTULOS_MOTIVO_DENUNCIA, ModeracaoService } from "../moderacao";
import type { MotivoDenuncia } from "../moderacao";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const OPCOES_MOTIVO = Object.keys(ROTULOS_MOTIVO_DENUNCIA) as MotivoDenuncia[];

type ReportScreenProps = NativeStackScreenProps<AppStackParamList, "Report">;

/**
 * Tela genérica de denúncia, usada por perfil, publicação, comentário e vaga: recebe `entidadeTipo`
 * e `entidadeId` pela navegação. Ao enviar, fecha com `goBack` e avisa com
 * `anunciarParaLeitorDeTela`, porque a tela inteira desmonta, como em `NovaPostagemScreen.tsx`.
 *
 * O motivo é escolhido numa lista própria de opções, e não com `ControleSegmentado`: a escolha é
 * obrigatória, mas começa vazia, e o `ControleSegmentado` exige sempre uma opção marcada.
 */
export function DenunciaScreen({ route, navigation }: ReportScreenProps) {
  const { tema } = useTema();
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
      anunciarParaLeitorDeTela("Denúncia enviada. Nossa equipe vai analisar.");
      navigation.goBack();
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível enviar a denúncia agora."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ paddingVertical: tema.spacing.lg }}>
        <Cartao elevacao="sm" style={{ gap: tema.spacing.md }}>
          {tituloAlvo ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]} numberOfLines={2}>
              Você está denunciando: {tituloAlvo}
            </Text>
          ) : null}

          <View style={{ gap: tema.spacing.xs }}>
            <Text accessibilityRole="header" style={[tema.typography.label, { color: tema.colors.textSecondary }]}>
              Motivo da denúncia
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Motivo da denúncia" style={{ gap: tema.spacing.xs }}>
              {OPCOES_MOTIVO.map((valor) => (
                <MotivoOpcao
                  key={valor}
                  label={ROTULOS_MOTIVO_DENUNCIA[valor]}
                  selecionado={motivo === valor}
                  onPress={() => setMotivo(valor)}
                  tema={tema}
                />
              ))}
            </View>
          </View>

          <CampoTexto
            rotulo="Descrição (opcional)"
            value={descricao}
            onChangeText={setDescricao}
            editable={!enviando}
            multiline
            style={{ minHeight: 96, textAlignVertical: "top" }}
            textoAjuda="Até 1000 caracteres. Conte mais detalhes, se quiser."
          />

          {erro ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
              {erro}
            </Text>
          ) : null}

          <Botao variant="destructive" onPress={() => void enviar()} carregando={enviando} disabled={enviando || !motivo}>
            Enviar denúncia
          </Botao>
        </Cartao>
      </ScrollView>
    </ContainerTela>
  );
}

function MotivoOpcao({ label, selecionado, onPress, tema }: { label: string; selecionado: boolean; onPress: () => void; tema: Tema }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: selecionado, checked: selecionado }}
      android_ripple={{ color: tema.colors.divider }}
      style={{
        minHeight: tema.sizes.touchTarget,
        paddingHorizontal: tema.spacing.md,
        borderRadius: tema.radius.md,
        borderWidth: selecionado ? 2 : 1,
        borderColor: selecionado ? tema.colors.primary.solid : tema.colors.border,
        backgroundColor: selecionado ? tema.colors.primary.soft : tema.colors.surface,
        justifyContent: "center",
      }}
    >
      <Text
        style={[
          tema.typography.body,
          { color: selecionado ? tema.colors.primary.onSoft : tema.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
