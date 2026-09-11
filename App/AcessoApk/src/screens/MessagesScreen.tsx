import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { Button, Card, ScreenContainer } from "../components/ui";
import { ConversaService } from "../mensagens";
import type { Conversa, ParticipanteConversa } from "../mensagens";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_POR_PAGINA = 20;

type AcaoBusca = "proximaPagina" | "retry" | null;

type MessagesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "Messages">,
  NativeStackScreenProps<AppStackParamList>
>;

/** Iniciais de um nome — mesma duplicação local já usada em outras telas (`HomeScreen`, `NotificationsScreen` etc.). */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

function nomeExibicao(participante: ParticipanteConversa | null): string {
  if (!participante) return "Usuário removido";
  return participante.empresa?.nomeFantasia ?? participante.empresa?.razaoSocial ?? participante.nome;
}

/** Quem é o OUTRO participante, do ponto de vista de `meuId` — nunca presume qual campo (`usuarioA`/`usuarioB`) é "o outro". */
function outroParticipante(conversa: Conversa, meuId: string | undefined): ParticipanteConversa | null {
  if (conversa.usuarioAId === meuId) return conversa.usuarioB;
  return conversa.usuarioA;
}

function formatarData(valor: string | null): string {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data)
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(data);
}

/**
 * Lista de conversas (Fase 17) — substitui o placeholder. Mesma paginação
 * incremental do Feed/Notificações + pull-to-refresh (Fase 16). Novidade
 * desta fase: reage a eventos de tempo real (`mensagem:nova`/
 * `conversa:atualizada`) recarregando a primeira página — mesma filosofia
 * de "sempre revalidar via REST" que o próprio backend documenta em
 * `realtime/socket.js` (o evento nunca traz o objeto de domínio completo
 * para o cliente confiar cegamente).
 */
export function MessagesScreen({ navigation }: MessagesScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [buscandoProximaPagina, setBuscandoProximaPagina] = useState<AcaoBusca>(null);
  const buscaEmVooRef = useRef(false);

  function acumularPagina(atual: Conversa[], novas: Conversa[]): Conversa[] {
    const idsExistentes = new Set(atual.map((conversa) => conversa.id));
    return [...atual, ...novas.filter((conversa) => !idsExistentes.has(conversa.id))];
  }

  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await ConversaService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setConversas(resposta.conversas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas conversas."));
      } finally {
        if (!cancelado) setCarregandoInicial(false);
      }
    }

    void carregarInicial();
    return () => {
      cancelado = true;
    };
  }, []);

  const recarregarDoInicio = useCallback(async (comoAtualizacao: boolean) => {
    if (comoAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregandoInicial(true);
    }
    setErro(null);
    try {
      const resposta = await ConversaService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
      setConversas(resposta.conversas);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas conversas."));
    } finally {
      if (comoAtualizacao) {
        setAtualizando(false);
      } else {
        setCarregandoInicial(false);
      }
    }
  }, []);

  // Tempo real: uma mensagem nova em QUALQUER conversa (ou uma conversa
  // marcada como lida em outro dispositivo) pode mudar a ordem/contagem —
  // recarrega a primeira página de novo, nunca tenta reconciliar o payload
  // do evento manualmente (mesma razão documentada em `realtime/socket.js`).
  useEffect(() => {
    const limparNova = ouvirEvento("mensagem:nova", () => void recarregarDoInicio(false));
    const limparAtualizada = ouvirEvento("conversa:atualizada", () => void recarregarDoInicio(false));
    return () => {
      limparNova();
      limparAtualizada();
    };
  }, [recarregarDoInicio]);

  const buscarProximaPagina = useCallback(
    async (acao: "proximaPagina" | "retry") => {
      if (carregandoInicial || buscaEmVooRef.current) return;
      if (pagina >= totalPaginas) return;

      buscaEmVooRef.current = true;
      setBuscandoProximaPagina(acao);
      setErro(null);
      try {
        const proxima = pagina + 1;
        const resposta = await ConversaService.listar({ page: proxima, limit: LIMITE_POR_PAGINA });
        setConversas((atual) => acumularPagina(atual, resposta.conversas));
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar mais conversas."));
      } finally {
        buscaEmVooRef.current = false;
        setBuscandoProximaPagina(null);
      }
    },
    [carregandoInicial, pagina, totalPaginas],
  );

  // Fase 25 (performance) — `useCallback` + `React.memo` no `ConversaListItem`.
  // O nome do outro participante já é calculado dentro do item; ele passa
  // pronto, então este handler só depende de `[navigation]`. Ver a razão
  // completa em `HomeScreen.tsx`.
  const abrirConversa = useCallback(
    (conversaId: string, nomeOutro: string) => {
      navigation.navigate("Conversation", { conversaId, nomeOutroParticipante: nomeOutro });
    },
    [navigation],
  );

  if (carregandoInicial) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && conversas.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar suas conversas
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={() => void recarregarDoInicio(false)}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        testID="conversas-lista"
        data={conversas}
        keyExtractor={(conversa) => conversa.id}
        // Fase 25 (performance) — ver o mesmo ajuste, com a razão completa, em `HomeScreen.tsx`.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        refreshControl={
          <RefreshControl
            testID="conversas-refresh"
            refreshing={atualizando}
            onRefresh={() => void recarregarDoInicio(true)}
            colors={[theme.colors.primary.solid]}
          />
        }
        ListEmptyComponent={
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Nenhuma conversa ainda</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Suas conversas com outras pessoas e empresas do ACESSO vão aparecer aqui.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          // `onPress` passado DIRETO — o item chama `onPress(conversa.id, nome)`. Ver `HomeScreen.tsx`.
          <ConversaListItem conversa={item} meuId={user?.id} theme={theme} onPress={abrirConversa} />
        )}
        ListFooterComponent={
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {buscandoProximaPagina === "proximaPagina" ? <ActivityIndicator color={theme.colors.primary.solid} /> : null}
            {erro && conversas.length > 0 ? (
              <View style={{ gap: theme.spacing.xs }}>
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={[theme.typography.caption, { color: theme.colors.error.solid }]}
                >
                  {erro}
                </Text>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void buscarProximaPagina("retry")}
                  loading={buscandoProximaPagina === "retry"}
                  disabled={buscandoProximaPagina !== null}
                >
                  Tentar novamente
                </Button>
              </View>
            ) : null}
            {total > 0 && pagina >= totalPaginas && !erro ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted, textAlign: "center" }]}>
                Você chegou ao fim das conversas.
              </Text>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

/**
 * Função local, não exportada — só `MessagesScreen` consome (mesmo padrão de
 * `PostagemListItem`/`NotificacaoItem`).
 *
 * `React.memo` (Fase 25, performance) — um evento de tempo real
 * (`mensagem:nova`) recarrega a lista inteira; sem o memo + `onPress`
 * estável, todas as linhas visíveis reprocessavam. Ver `HomeScreen.tsx`.
 */
const ConversaListItem = memo(function ConversaListItem({
  conversa,
  meuId,
  theme,
  onPress,
}: {
  conversa: Conversa;
  meuId: string | undefined;
  theme: Theme;
  onPress: (conversaId: string, nomeOutro: string) => void;
}) {
  const outro = outroParticipante(conversa, meuId);
  const nome = nomeExibicao(outro);
  const naoLidas = conversa.mensagensNaoLidas;

  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(conversa.id, nome)}
        accessibilityRole="button"
        accessibilityLabel={`Conversa com ${nome}${naoLidas > 0 ? `, ${naoLidas} mensagem${naoLidas === 1 ? "" : "s"} não lida${naoLidas === 1 ? "" : "s"}` : ""}`}
        android_ripple={{ color: theme.colors.divider }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
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
            <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>{iniciaisDoNome(nome)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={[theme.typography.body, { color: theme.colors.textPrimary, fontWeight: naoLidas > 0 ? "700" : "400" }]}
              numberOfLines={1}
            >
              {nome}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            {conversa.ultimaMensagem ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{formatarData(conversa.ultimaMensagem)}</Text>
            ) : null}
            {naoLidas > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  backgroundColor: theme.colors.primary.solid,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[theme.typography.caption, { color: theme.colors.primary.onSolid, fontWeight: "700" }]}>{naoLidas}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      </Pressable>
    </View>
  );
});
