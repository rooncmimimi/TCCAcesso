import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button, Card, Input, ScreenContainer, SegmentedControl, ToggleRow } from "../components/ui";
import type { ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import {
  CONTRATO_LABEL,
  MODALIDADE_LABEL,
  PUBLICO_ALVO_LABEL,
  RECURSO_ACESSIBILIDADE_LABEL,
  VagasService,
} from "../vagas";
import type { ContratoVaga, ModalidadeVaga, PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga, VagaDados } from "../vagas";

type JobFormScreenProps = NativeStackScreenProps<ProfileStackParamList, "JobForm">;

const OPCOES_MODALIDADE = (Object.keys(MODALIDADE_LABEL) as ModalidadeVaga[]).map((valor) => ({
  label: MODALIDADE_LABEL[valor],
  value: valor,
}));
const OPCOES_CONTRATO = (Object.keys(CONTRATO_LABEL) as ContratoVaga[]).map((valor) => ({
  label: CONTRATO_LABEL[valor],
  value: valor,
}));
const OPCOES_PUBLICO_ALVO = (Object.keys(PUBLICO_ALVO_LABEL) as PublicoAlvoVaga[]).map((valor) => ({
  label: PUBLICO_ALVO_LABEL[valor],
  value: valor,
}));
const OPCOES_RECURSOS = Object.keys(RECURSO_ACESSIBILIDADE_LABEL) as RecursoAcessibilidadeVaga[];

/**
 * Criar/editar vaga (Fase 18 — Modo Empresa). Uma tela só para os dois
 * casos — `route.params.vagaId` ausente = criar (formulário em branco,
 * sem busca nenhuma), presente = editar (pré-preenche buscando
 * `VagasService.obterPorId`, reaproveitado da Fase 9, antes só usado para
 * exibição). Alterar status (Pausar/Reabrir/Encerrar) e excluir a vaga NÃO
 * vivem aqui de propósito — são ações do dia a dia mais frequentes que
 * editar o conteúdo, então moram como botões dedicados em
 * `JobApplicantsScreen`, ao lado da lista de candidaturas.
 */
export function JobFormScreen({ route, navigation }: JobFormScreenProps) {
  const { theme } = useTheme();
  const { vagaId } = route.params;
  const editando = Boolean(vagaId);

  const [vagaOriginal, setVagaOriginal] = useState<Vaga | null>(null);
  const [carregando, setCarregando] = useState(editando);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!vagaId) return;
    let cancelado = false;

    async function carregar() {
      try {
        const vaga = await VagasService.obterPorId(vagaId as string);
        if (cancelado) return;
        setVagaOriginal(vaga);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErroCarregamento(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar esta vaga."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [vagaId, tentativa]);

  function tentarNovamente() {
    setErroCarregamento(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  if (carregando) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erroCarregamento && !vagaOriginal) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar esta vaga
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erroCarregamento}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg }}>
        <Formulario vagaId={vagaId} vagaOriginal={vagaOriginal} theme={theme} onSalvo={() => navigation.goBack()} />
      </ScrollView>
    </ScreenContainer>
  );
}

function Formulario({
  vagaId,
  vagaOriginal,
  theme,
  onSalvo,
}: {
  vagaId: string | undefined;
  vagaOriginal: Vaga | null;
  theme: Theme;
  onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState(vagaOriginal?.titulo ?? "");
  const [descricao, setDescricao] = useState(vagaOriginal?.descricao ?? "");
  const [requisitos, setRequisitos] = useState(vagaOriginal?.requisitos ?? "");
  const [beneficios, setBeneficios] = useState(vagaOriginal?.beneficios ?? "");
  const [salario, setSalario] = useState(vagaOriginal?.salario != null ? String(vagaOriginal.salario) : "");
  const [modalidade, setModalidade] = useState<ModalidadeVaga>(vagaOriginal?.modalidade ?? "Remoto");
  const [contrato, setContrato] = useState<ContratoVaga>(vagaOriginal?.contrato ?? "CLT");
  const [cidade, setCidade] = useState(vagaOriginal?.cidade ?? "");
  const [estado, setEstado] = useState(vagaOriginal?.estado ?? "");
  const [cargaHoraria, setCargaHoraria] = useState(vagaOriginal?.cargaHoraria ?? "");
  const [exclusivaPcd, setExclusivaPcd] = useState(Boolean(vagaOriginal?.exclusivaPcd));
  const [publicoAlvo, setPublicoAlvo] = useState<PublicoAlvoVaga>(vagaOriginal?.publicoAlvo ?? "geral");
  const [recursosAcessibilidade, setRecursosAcessibilidade] = useState<RecursoAcessibilidadeVaga[]>(
    vagaOriginal?.recursosAcessibilidade ?? [],
  );
  const [acessibilidade, setAcessibilidade] = useState(vagaOriginal?.acessibilidade ?? "");
  const [dataEncerramento, setDataEncerramento] = useState(vagaOriginal?.dataEncerramento ?? "");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarRecurso(recurso: RecursoAcessibilidadeVaga) {
    setRecursosAcessibilidade((atual) =>
      atual.includes(recurso) ? atual.filter((item) => item !== recurso) : [...atual, recurso],
    );
  }

  async function salvar() {
    if (salvando) return;
    if (!titulo.trim() || titulo.trim().length < 5) {
      setErro("O título deve ter pelo menos 5 caracteres.");
      return;
    }
    if (!descricao.trim() || descricao.trim().length < 20) {
      setErro("A descrição deve ter pelo menos 20 caracteres.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const dados: VagaDados = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        requisitos: requisitos.trim(),
        beneficios: beneficios.trim(),
        modalidade,
        contrato,
        cidade: cidade.trim(),
        estado: estado.trim() ? estado.trim().toUpperCase() : undefined,
        cargaHoraria: cargaHoraria.trim(),
        exclusivaPcd,
        publicoAlvo,
        recursosAcessibilidade,
        acessibilidade: acessibilidade.trim(),
        ...(salario.trim() ? { salario: salario.trim() } : {}),
        ...(dataEncerramento.trim() ? { dataEncerramento: dataEncerramento.trim() } : {}),
      };

      if (vagaId) {
        await VagasService.atualizar(vagaId, dados);
      } else {
        await VagasService.criar(dados);
      }
      onSalvo();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar a vaga agora."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.md }}>
      <Input label="Título" value={titulo} onChangeText={setTitulo} editable={!salvando} helperText="Entre 5 e 200 caracteres." />
      <Input
        label="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        editable={!salvando}
        multiline
        style={{ minHeight: 120, textAlignVertical: "top" }}
        helperText="No mínimo 20 caracteres."
      />
      <Input
        label="Requisitos"
        value={requisitos}
        onChangeText={setRequisitos}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />
      <Input
        label="Benefícios"
        value={beneficios}
        onChangeText={setBeneficios}
        editable={!salvando}
        multiline
        style={{ minHeight: 96, textAlignVertical: "top" }}
      />
      <Input
        label="Salário"
        value={salario}
        onChangeText={setSalario}
        editable={!salvando}
        keyboardType="decimal-pad"
        helperText="Opcional. Deixe em branco para não informar."
      />

      <SegmentedControl label="Modalidade" value={modalidade} onChange={setModalidade} options={OPCOES_MODALIDADE} />
      <SegmentedControl label="Contrato" value={contrato} onChange={setContrato} options={OPCOES_CONTRATO} />

      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <View style={{ flex: 2 }}>
          <Input label="Cidade" value={cidade} onChangeText={setCidade} editable={!salvando} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="UF" value={estado} onChangeText={setEstado} editable={!salvando} maxLength={2} autoCapitalize="characters" />
        </View>
      </View>
      <Input label="Carga horária" value={cargaHoraria} onChangeText={setCargaHoraria} editable={!salvando} placeholder="Ex.: 40h semanais" />

      <ToggleRow
        label="Exclusiva para PCD"
        description="Só pessoas com deficiência podem se candidatar."
        value={exclusivaPcd}
        onValueChange={setExclusivaPcd}
      />
      <SegmentedControl label="Público-alvo" value={publicoAlvo} onChange={setPublicoAlvo} options={OPCOES_PUBLICO_ALVO} />

      <View style={{ gap: theme.spacing.xs }}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Recursos de acessibilidade</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
          {OPCOES_RECURSOS.map((recurso) => {
            const selecionado = recursosAcessibilidade.includes(recurso);
            return (
              <Pressable
                key={recurso}
                onPress={() => alternarRecurso(recurso)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selecionado }}
                accessibilityLabel={RECURSO_ACESSIBILIDADE_LABEL[recurso]}
                android_ripple={{ color: theme.colors.divider }}
                style={{
                  minHeight: theme.sizes.touchTarget,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  borderWidth: selecionado ? 2 : 1,
                  borderColor: selecionado ? theme.colors.primary.solid : theme.colors.border,
                  backgroundColor: selecionado ? theme.colors.primary.soft : theme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={[
                    theme.typography.bodySmall,
                    { color: selecionado ? theme.colors.primary.onSoft : theme.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
                  ]}
                >
                  {RECURSO_ACESSIBILIDADE_LABEL[recurso]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Input
        label="Outras informações de acessibilidade"
        value={acessibilidade}
        onChangeText={setAcessibilidade}
        editable={!salvando}
        multiline
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      <Input
        label="Data de encerramento"
        value={dataEncerramento}
        onChangeText={setDataEncerramento}
        editable={!salvando}
        placeholder="AAAA-MM-DD"
        helperText="Opcional."
      />

      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}

      <Button onPress={() => void salvar()} loading={salvando} disabled={salvando}>
        {vagaId ? "Salvar alterações" : "Publicar vaga"}
      </Button>
    </Card>
  );
}
