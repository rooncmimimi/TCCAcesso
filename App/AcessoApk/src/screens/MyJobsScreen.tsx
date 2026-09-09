import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Badge, Button, Card, ScreenContainer } from "../components/ui";
import type { BadgeVariant } from "../components/ui";
import type { ProfileStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { STATUS_VAGA_LABEL, VagasService } from "../vagas";
import type { VagaComContagem } from "../vagas";

const LIMITE_POR_PAGINA = 10;

type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry";

type MyJobsScreenProps = NativeStackScreenProps<ProfileStackParamList, "MyJobs">;

const VARIANTE_STATUS: Record<VagaComContagem["status"], BadgeVariant> = {
  Aberta: "success",
  Pausada: "warning",
  Encerrada: "neutral",
};

/**
 * Painel de vagas da própria empresa (Fase 18 — Modo Empresa). Paginação
 * clássica, mesmo padrão de `JobsScreen.tsx` (Fase 9) — a lista das vagas de
 * UMA empresa é finita e "fecha", não é um feed sem fim. Sem consulta
 * separada de `statusAprovacao`: se a empresa não está aprovada, `GET
 * /vagas/minhas` já 403 com a mensagem certa (`garantirEmpresaAprovada` no
 * backend), que aparece aqui como o próprio estado de erro da tela — evita
 * uma segunda chamada só para decidir se mostra um aviso.
 */
export function MyJobsScreen({ navigation }: MyJobsScreenProps) {
  const { theme } = useTheme();

  const [vagas, setVagas] = useState<VagaComContagem[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<AcaoBusca | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscar = useCallback(async (paginaAlvo: number, acao: AcaoBusca) => {
    setBuscando(acao);
    setErro(null);
    try {
      const resposta = await VagasService.minhas({ page: paginaAlvo, limit: LIMITE_POR_PAGINA });
      setVagas(resposta.vagas);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas vagas."));
    } finally {
      setBuscando(null);
      setPrimeiroCarregamentoConcluido(true);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await VagasService.minhas({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setVagas(resposta.vagas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas vagas."));
      } finally {
        if (!cancelado) {
          setBuscando(null);
          setPrimeiroCarregamentoConcluido(true);
        }
      }
    }

    void carregarInicial();
    return () => {
      cancelado = true;
    };
  }, []);

  function novaVaga() {
    navigation.navigate("JobForm", {});
  }

  function abrirCandidaturas(vaga: VagaComContagem) {
    navigation.navigate("JobApplicants", { vagaId: vaga.id, vagaTitulo: vaga.titulo });
  }

  if (!primeiroCarregamentoConcluido) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && vagas.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar suas vagas
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={() => void buscar(1, "retry")} loading={buscando === "retry"} disabled={buscando !== null}>
              Tentar novamente
            </Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md, flexGrow: 1 }}>
        <Button onPress={novaVaga}>Nova vaga</Button>

        {total > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}
          >
            {`${total} vaga${total === 1 ? "" : "s"}${totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""}`}
          </Text>
        ) : null}

        {vagas.length === 0 ? (
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Nenhuma vaga publicada ainda</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Toque em Nova vaga para publicar a primeira oportunidade da sua empresa.
            </Text>
          </Card>
        ) : (
          vagas.map((vaga) => <MinhaVagaItem key={vaga.id} vaga={vaga} theme={theme} onPress={() => abrirCandidaturas(vaga)} />)
        )}

        {totalPaginas > 1 ? (
          <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Button
              variant="outline"
              size="small"
              onPress={() => void buscar(pagina - 1, "anterior")}
              loading={buscando === "anterior"}
              disabled={buscando !== null || pagina <= 1}
            >
              Página anterior
            </Button>
            <Button
              variant="outline"
              size="small"
              onPress={() => void buscar(pagina + 1, "proxima")}
              loading={buscando === "proxima"}
              disabled={buscando !== null || pagina >= totalPaginas}
            >
              Próxima página
            </Button>
          </View>
        ) : null}

        {erro && vagas.length > 0 ? (
          <View style={{ gap: theme.spacing.xs }}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
              {erro}
            </Text>
            <Button variant="outline" size="small" onPress={() => void buscar(pagina, "retry")} loading={buscando === "retry"} disabled={buscando !== null}>
              Tentar novamente
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

/** Função local, não exportada — só `MyJobsScreen` consome (mesmo padrão de `VagaListItem` em `JobsScreen.tsx`). */
function MinhaVagaItem({ vaga, theme, onPress }: { vaga: VagaComContagem; theme: Theme; onPress: () => void }) {
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${vaga.titulo}, ${STATUS_VAGA_LABEL[vaga.status]}, ${vaga.totalCandidaturas} candidatura${vaga.totalCandidaturas === 1 ? "" : "s"}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: theme.spacing.sm }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary, flex: 1 }]} numberOfLines={2}>
              {vaga.titulo}
            </Text>
            <Badge variant={VARIANTE_STATUS[vaga.status]}>{STATUS_VAGA_LABEL[vaga.status]}</Badge>
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {vaga.totalCandidaturas} candidatura{vaga.totalCandidaturas === 1 ? "" : "s"}
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}
