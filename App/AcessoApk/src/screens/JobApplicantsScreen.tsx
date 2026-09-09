import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Badge, Button, Card, ScreenContainer, SegmentedControl } from "../components/ui";
import type { BadgeVariant } from "../components/ui";
import type { AppStackParamList, ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { MODALIDADE_LABEL, STATUS_CANDIDATURA_LABEL, STATUS_VAGA_LABEL, VagasService } from "../vagas";
import type { Candidatura, StatusCandidatura, StatusVaga, Vaga } from "../vagas";

const LIMITE_CANDIDATURAS = 50;

/** Precisa navegar até `PublicProfile`, que mora no Stack pai (`AppStackParamList`), não dentro do próprio `ProfileStack` — mesmo padrão de `DiscoverScreen.tsx` (Fase 14). */
type JobApplicantsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<ProfileStackParamList, "JobApplicants">,
  NativeStackScreenProps<AppStackParamList>
>;

/** Só os 4 status que a EMPRESA pode aplicar (`CandidaturaService.STATUS_EMPRESA` no backend) — "Pendente" é o estado inicial (ninguém atribui de volta a ele) e "Cancelada" é exclusivo do próprio candidato. */
const STATUS_EMPRESA: StatusCandidatura[] = ["Visualizada", "EmAnalise", "Aprovada", "Rejeitada"];
const OPCOES_STATUS_CANDIDATURA = STATUS_EMPRESA.map((valor) => ({ label: STATUS_CANDIDATURA_LABEL[valor], value: valor }));

const VARIANTE_STATUS_VAGA: Record<StatusVaga, BadgeVariant> = {
  Aberta: "success",
  Pausada: "warning",
  Encerrada: "neutral",
};

const VARIANTE_STATUS_CANDIDATURA: Record<StatusCandidatura, BadgeVariant> = {
  Pendente: "neutral",
  Visualizada: "info",
  EmAnalise: "warning",
  Aprovada: "success",
  Rejeitada: "error",
  Cancelada: "neutral",
};

function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

function confirmarExclusao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: aoConfirmar },
  ]);
}

/**
 * Detalhe de gestão de UMA vaga (Fase 18 — Modo Empresa): dados da vaga +
 * ações de status/exclusão + candidaturas recebidas, cada uma com controle
 * de status próprio. Vaga e candidaturas carregam JUNTAS (`Promise.all`,
 * não independentes como `PostagemDetailScreen`) — é uma tela de gestão de
 * um recurso só, não duas seções que fazem sentido sozinhas.
 *
 * Sem "carregar mais" candidaturas nesta fase — busca um lote generoso
 * (50) de uma vez, mesmo recorte já aceito em `ConversationScreen.tsx`
 * (Fase 17) para o histórico de mensagens.
 */
export function JobApplicantsScreen({ route, navigation }: JobApplicantsScreenProps) {
  const { theme } = useTheme();
  const { vagaId } = route.params;

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [processandoAcaoVaga, setProcessandoAcaoVaga] = useState<"pausar" | "reabrir" | "encerrar" | "excluir" | null>(null);
  const [erroAcaoVaga, setErroAcaoVaga] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const [vagaRes, candidaturasRes] = await Promise.all([
          VagasService.obterPorId(vagaId),
          VagasService.listarCandidaturas(vagaId, { page: 1, limit: LIMITE_CANDIDATURAS }),
        ]);
        if (cancelado) return;
        setVaga(vagaRes);
        setCandidaturas(candidaturasRes.candidaturas);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar esta vaga."));
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
    setErro(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  async function mudarStatusVaga(acao: "pausar" | "reabrir" | "encerrar", novoStatus: StatusVaga) {
    if (processandoAcaoVaga) return;
    setProcessandoAcaoVaga(acao);
    setErroAcaoVaga(null);
    try {
      const atualizada = await VagasService.alterarStatus(vagaId, novoStatus);
      setVaga(atualizada);
    } catch (erroRequisicao) {
      setErroAcaoVaga(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar o status agora."));
    } finally {
      setProcessandoAcaoVaga(null);
    }
  }

  async function excluirVaga() {
    if (processandoAcaoVaga) return;
    setProcessandoAcaoVaga("excluir");
    setErroAcaoVaga(null);
    try {
      await VagasService.remover(vagaId);
      navigation.goBack();
    } catch (erroRequisicao) {
      setErroAcaoVaga(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir a vaga agora."));
      setProcessandoAcaoVaga(null);
    }
  }

  function editarVaga() {
    navigation.navigate("JobForm", { vagaId });
  }

  function abrirPerfilCandidato(usuarioId: string) {
    navigation.navigate("PublicProfile", { usuarioId });
  }

  function atualizarCandidaturaNaLista(id: string, atualizada: Candidatura) {
    setCandidaturas((atual) => atual.map((candidatura) => (candidatura.id === id ? atualizada : candidatura)));
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

  if (erro && !vaga) {
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
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  if (!vaga) return null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingVertical: theme.spacing.lg }}>
        <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: theme.spacing.sm }}>
            <Text style={[theme.typography.heading, { color: theme.colors.textPrimary, flex: 1 }]}>{vaga.titulo}</Text>
            <Badge variant={VARIANTE_STATUS_VAGA[vaga.status]}>{STATUS_VAGA_LABEL[vaga.status]}</Badge>
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {MODALIDADE_LABEL[vaga.modalidade]}
            {vaga.cidade ? ` · ${vaga.cidade}${vaga.estado ? ` - ${vaga.estado}` : ""}` : ""}
          </Text>

          <Button variant="outline" onPress={editarVaga}>
            Editar vaga
          </Button>

          <View style={{ flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" }}>
            {vaga.status !== "Pausada" ? (
              <View style={{ flex: 1 }}>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void mudarStatusVaga("pausar", "Pausada")}
                  loading={processandoAcaoVaga === "pausar"}
                  disabled={processandoAcaoVaga !== null || vaga.status === "Encerrada"}
                >
                  Pausar
                </Button>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void mudarStatusVaga("reabrir", "Aberta")}
                  loading={processandoAcaoVaga === "reabrir"}
                  disabled={processandoAcaoVaga !== null}
                >
                  Reabrir
                </Button>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                variant="outline"
                size="small"
                onPress={() => void mudarStatusVaga("encerrar", "Encerrada")}
                loading={processandoAcaoVaga === "encerrar"}
                disabled={processandoAcaoVaga !== null || vaga.status === "Encerrada"}
              >
                Encerrar
              </Button>
            </View>
          </View>

          <Button
            variant="destructive"
            size="small"
            onPress={() =>
              confirmarExclusao(
                "Excluir vaga",
                "Esta ação é definitiva e remove também o histórico de candidaturas. Continuar?",
                () => void excluirVaga(),
              )
            }
            loading={processandoAcaoVaga === "excluir"}
            disabled={processandoAcaoVaga !== null}
          >
            Excluir vaga
          </Button>

          {erroAcaoVaga ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
              {erroAcaoVaga}
            </Text>
          ) : null}
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
            Candidaturas ({candidaturas.length})
          </Text>
          {candidaturas.length === 0 ? (
            <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
              <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
                Ninguém se candidatou a esta vaga ainda.
              </Text>
            </Card>
          ) : (
            candidaturas.map((candidatura) => (
              <CandidaturaItem
                key={candidatura.id}
                candidatura={candidatura}
                theme={theme}
                onAbrirPerfil={abrirPerfilCandidato}
                onAtualizada={(atualizada) => atualizarCandidaturaNaLista(candidatura.id, atualizada)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/** Função local, não exportada — só `JobApplicantsScreen` consome. */
function CandidaturaItem({
  candidatura,
  theme,
  onAbrirPerfil,
  onAtualizada,
}: {
  candidatura: Candidatura;
  theme: Theme;
  onAbrirPerfil: (usuarioId: string) => void;
  onAtualizada: (atualizada: Candidatura) => void;
}) {
  const [alterando, setAlterando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const usuario = candidatura.candidato?.usuario;
  const status = candidatura.status ?? "Pendente";

  async function mudarStatus(novoStatus: StatusCandidatura) {
    if (alterando || novoStatus === status) return;
    setAlterando(true);
    setErro(null);
    try {
      const atualizada = await VagasService.atualizarStatusCandidatura(candidatura.id, novoStatus);
      onAtualizada(atualizada);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível atualizar o status agora."));
    } finally {
      setAlterando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
      <Pressable
        onPress={() => usuario?.id && onAbrirPerfil(usuario.id)}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${usuario?.nome ?? "candidato"}`}
        disabled={!usuario?.id}
        style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}
      >
        <View
          accessible={false}
          style={{
            width: theme.sizes.avatarMedium,
            height: theme.sizes.avatarMedium,
            borderRadius: theme.sizes.avatarMedium / 2,
            backgroundColor: theme.colors.primary.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>{iniciaisDoNome(usuario?.nome)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {usuario?.nome ?? "Candidato"}
          </Text>
          {usuario?.email ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {usuario.email}
            </Text>
          ) : null}
        </View>
        <Badge variant={VARIANTE_STATUS_CANDIDATURA[status]}>{STATUS_CANDIDATURA_LABEL[status]}</Badge>
      </Pressable>

      {candidatura.mensagem ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{candidatura.mensagem}</Text>
      ) : null}

      <SegmentedControl
        label="Status da candidatura"
        value={status}
        onChange={(valor) => void mudarStatus(valor)}
        options={OPCOES_STATUS_CANDIDATURA}
      />
      {alterando ? <ActivityIndicator color={theme.colors.primary.solid} /> : null}
      {erro ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
          {erro}
        </Text>
      ) : null}
    </Card>
  );
}
