import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { NotificacaoService } from "../notificacoes";
import type { Notificacao } from "../notificacoes";
import { Button, Card, ScreenContainer } from "../components/ui";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { SeguidorService } from "../seguidores";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_POR_PAGINA = 15;

type AcaoBusca = "proximaPagina" | "retry" | null;

/**
 * `Notifications` (a aba) precisa navegar para `PublicProfile`/
 * `PostagemDetail`/`VagaDetail`, que moram no Stack PAI (`AppStackParamList`),
 * não dentro da própria tab — mesmo padrão de `HomeScreen`/`JobsScreen`.
 */
type NotificationsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "Notifications">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Central de notificações (Fase 16) — substitui o placeholder das fases
 * anteriores. Mesma paginação incremental do Feed (Fase 10): lista que só
 * cresce, `FlatList.onEndReached`, nunca mais de uma busca de página em voo.
 * Acrescenta pull-to-refresh (não existia no Feed) porque aqui "o que
 * aconteceu desde a última vez que eu olhei" é o motivo de existir da tela —
 * sem isso o usuário não teria como saber que há notificações novas sem sair
 * e voltar para a aba.
 */
export function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const { theme } = useTheme();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [buscandoProximaPagina, setBuscandoProximaPagina] = useState<AcaoBusca>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  // Guarda de concorrência de verdade (não `useState`) — mesmo raciocínio de
  // `HomeScreen`: `onEndReached` pode disparar mais de uma vez no mesmo tick.
  const buscaEmVooRef = useRef(false);

  function acumularPagina(atual: Notificacao[], novas: Notificacao[]): Notificacao[] {
    const idsExistentes = new Set(atual.map((notificacao) => notificacao.id));
    return [...atual, ...novas.filter((notificacao) => !idsExistentes.has(notificacao.id))];
  }

  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await NotificacaoService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setNotificacoes(resposta.notificacoes);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas notificações."));
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
      const resposta = await NotificacaoService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
      setNotificacoes(resposta.notificacoes);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar suas notificações."));
    } finally {
      if (comoAtualizacao) {
        setAtualizando(false);
      } else {
        setCarregandoInicial(false);
      }
    }
  }, []);

  const buscarProximaPagina = useCallback(
    async (acao: "proximaPagina" | "retry") => {
      if (carregandoInicial || buscaEmVooRef.current) return;
      if (pagina >= totalPaginas) return;

      buscaEmVooRef.current = true;
      setBuscandoProximaPagina(acao);
      setErro(null);
      try {
        const proxima = pagina + 1;
        const resposta = await NotificacaoService.listar({ page: proxima, limit: LIMITE_POR_PAGINA });
        setNotificacoes((atual) => acumularPagina(atual, resposta.notificacoes));
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar mais notificações."));
      } finally {
        buscaEmVooRef.current = false;
        setBuscandoProximaPagina(null);
      }
    },
    [carregandoInicial, pagina, totalPaginas],
  );

  function atualizarNaLista(id: string, alteracoes: Partial<Notificacao>) {
    setNotificacoes((atual) => atual.map((notificacao) => (notificacao.id === id ? { ...notificacao, ...alteracoes } : notificacao)));
  }

  function removerDaLista(id: string) {
    setNotificacoes((atual) => atual.filter((notificacao) => notificacao.id !== id));
    setTotal((atual) => Math.max(0, atual - 1));
  }

  /**
   * Só os `entidadeTipo` com tela correspondente NESTE app navegam — os
   * demais (`conversa`: Fase 17 ainda não existe; `empresa`/`denuncia`: sem
   * tela de terceiros para eles aqui) só marcam como lida ao tocar, sem
   * inventar uma rota que não existe (achado da auditoria, ver comentário em
   * `notificacoes/types.ts`).
   */
  function navegarSePossivel(notificacao: Notificacao) {
    switch (notificacao.entidadeTipo) {
      case "usuario":
        if (notificacao.entidadeId) navigation.navigate("PublicProfile", { usuarioId: notificacao.entidadeId });
        return;
      case "postagem":
        if (notificacao.entidadeId) navigation.navigate("PostagemDetail", { postagemId: notificacao.entidadeId });
        return;
      case "vaga":
        if (notificacao.entidadeId) navigation.navigate("VagaDetail", { vagaId: notificacao.entidadeId });
        return;
      case "solicitacao_seguimento":
        // Sem tela de "solicitação" — mas o ator (quem pediu pra seguir) tem
        // perfil visível, então o toque no corpo do card leva até ele.
        if (notificacao.ator) navigation.navigate("PublicProfile", { usuarioId: notificacao.ator.id });
        return;
      default:
        return;
    }
  }

  async function marcarComoLidaEmSegundoPlano(id: string) {
    try {
      await NotificacaoService.marcarComoLida(id);
      atualizarNaLista(id, { lida: true });
    } catch {
      // Estado de "lida" não é crítico (mesmo raciocínio do curtir em
      // `HomeScreen`) — uma falha aqui não deve incomodar quem só queria ver
      // o conteúdo. A notificação continua marcada como não lida na lista;
      // a próxima ação sobre ela tenta de novo.
    }
  }

  function abrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.lida) {
      void marcarComoLidaEmSegundoPlano(notificacao.id);
    }
    navegarSePossivel(notificacao);
  }

  async function marcarTodasComoLidas() {
    if (marcandoTodas) return;
    setMarcandoTodas(true);
    try {
      await NotificacaoService.marcarTodasComoLidas();
      setNotificacoes((atual) => atual.map((notificacao) => ({ ...notificacao, lida: true })));
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível marcar tudo como lido agora."));
    } finally {
      setMarcandoTodas(false);
    }
  }

  async function removerNotificacao(id: string) {
    try {
      await NotificacaoService.remover(id);
      removerDaLista(id);
    } catch {
      // Sem mensagem bloqueante — a linha simplesmente continua ali, quem
      // tentou pode tocar em "Remover" de novo.
    }
  }

  async function aceitarSolicitacao(notificacao: Notificacao) {
    if (!notificacao.entidadeId) return;
    await SeguidorService.aceitarSolicitacao(notificacao.entidadeId);
    atualizarNaLista(notificacao.id, { lida: true, subtipo: "solicitacao_seguimento_resolvida_aceita" });
    void marcarComoLidaEmSegundoPlano(notificacao.id);
  }

  async function recusarSolicitacao(notificacao: Notificacao) {
    if (!notificacao.entidadeId) return;
    await SeguidorService.recusarSolicitacao(notificacao.entidadeId);
    atualizarNaLista(notificacao.id, { lida: true, subtipo: "solicitacao_seguimento_resolvida_recusada" });
    void marcarComoLidaEmSegundoPlano(notificacao.id);
  }

  const existeNaoLida = notificacoes.some((notificacao) => !notificacao.lida);

  if (carregandoInicial) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && notificacoes.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar suas notificações
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
        testID="notificacoes-lista"
        data={notificacoes}
        keyExtractor={(notificacao) => notificacao.id}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        refreshControl={
          <RefreshControl
            testID="notificacoes-refresh"
            refreshing={atualizando}
            onRefresh={() => void recarregarDoInicio(true)}
            colors={[theme.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          existeNaoLida ? (
            <View style={{ alignItems: "flex-end", marginBottom: theme.spacing.sm }}>
              <Button variant="ghost" size="small" onPress={() => void marcarTodasComoLidas()} loading={marcandoTodas} disabled={marcandoTodas}>
                Marcar todas como lidas
              </Button>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Nenhuma notificação ainda</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Curtidas, comentários, novos seguidores e outras novidades vão aparecer aqui.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <NotificacaoItem
            notificacao={item}
            theme={theme}
            onAbrir={() => abrirNotificacao(item)}
            onAceitar={() => aceitarSolicitacao(item)}
            onRecusar={() => recusarSolicitacao(item)}
            onRemover={() => removerNotificacao(item.id)}
          />
        )}
        ListFooterComponent={
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {buscandoProximaPagina === "proximaPagina" ? <ActivityIndicator color={theme.colors.primary.solid} /> : null}
            {erro && notificacoes.length > 0 ? (
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
                Você chegou ao fim das notificações.
              </Text>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

/** Iniciais de um nome — mesma duplicação local já usada em `HomeScreen`/
 * `PostagemDetailScreen`/`PublicProfileScreen`/`DiscoverScreen`/
 * `FollowListScreen` (não existe componente de avatar compartilhado ainda). */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

function formatarData(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(data);
}

const SOLICITACAO_ACEITA = "solicitacao_seguimento_resolvida_aceita";
const SOLICITACAO_RECUSADA = "solicitacao_seguimento_resolvida_recusada";

/** Função local, não exportada — só `NotificationsScreen` consome (mesmo padrão de `PostagemListItem` em `HomeScreen`). */
function NotificacaoItem({
  notificacao,
  theme,
  onAbrir,
  onAceitar,
  onRecusar,
  onRemover,
}: {
  notificacao: Notificacao;
  theme: Theme;
  onAbrir: () => void;
  onAceitar: () => Promise<void>;
  onRecusar: () => Promise<void>;
  onRemover: () => Promise<void>;
}) {
  const [resolvendo, setResolvendo] = useState<"aceitar" | "recusar" | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const solicitacaoPendente = notificacao.subtipo === "solicitacao_seguimento";
  const nomeAtor = notificacao.ator?.nome;

  async function tocarAceitar() {
    if (resolvendo) return;
    setResolvendo("aceitar");
    setErroAcao(null);
    try {
      await onAceitar();
    } catch (erro) {
      setErroAcao(getFriendlyErrorMessage(erro, "Não foi possível aceitar agora."));
    } finally {
      setResolvendo(null);
    }
  }

  async function tocarRecusar() {
    if (resolvendo) return;
    setResolvendo("recusar");
    setErroAcao(null);
    try {
      await onRecusar();
    } catch (erro) {
      setErroAcao(getFriendlyErrorMessage(erro, "Não foi possível recusar agora."));
    } finally {
      setResolvendo(null);
    }
  }

  async function tocarRemover() {
    if (removendo) return;
    setRemovendo(true);
    try {
      await onRemover();
    } finally {
      setRemovendo(false);
    }
  }

  const rotuloAcessibilidade = `${notificacao.lida ? "" : "Não lida. "}${notificacao.titulo}${notificacao.descricao ? `. ${notificacao.descricao}` : ""}`;

  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable onPress={onAbrir} accessibilityRole="button" accessibilityLabel={rotuloAcessibilidade} android_ripple={{ color: theme.colors.divider }}>
        <Card
          elevation="sm"
          style={{
            gap: theme.spacing.xs,
            borderLeftWidth: notificacao.lida ? 0 : 3,
            borderLeftColor: theme.colors.primary.solid,
          }}
        >
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <View
              accessible={false}
              style={{
                width: theme.sizes.avatarSmall,
                height: theme.sizes.avatarSmall,
                borderRadius: theme.sizes.avatarSmall / 2,
                backgroundColor: theme.colors.primary.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.primary.onSoft }]}>
                {nomeAtor ? iniciaisDoNome(nomeAtor) : "🔔"}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[theme.typography.label, { color: theme.colors.textPrimary, fontWeight: notificacao.lida ? "400" : "700" }]}
                numberOfLines={2}
              >
                {notificacao.titulo}
              </Text>
              {notificacao.descricao ? (
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                  {notificacao.descricao}
                </Text>
              ) : null}
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{formatarData(notificacao.created_at)}</Text>
            </View>
          </View>

          {solicitacaoPendente ? (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Button size="small" onPress={() => void tocarAceitar()} loading={resolvendo === "aceitar"} disabled={resolvendo !== null}>
                  Aceitar
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void tocarRecusar()}
                  loading={resolvendo === "recusar"}
                  disabled={resolvendo !== null}
                >
                  Recusar
                </Button>
              </View>
            </View>
          ) : null}

          {notificacao.subtipo === SOLICITACAO_ACEITA ? (
            <Text style={[theme.typography.caption, { color: theme.colors.success.solid }]}>Solicitação aceita.</Text>
          ) : null}
          {notificacao.subtipo === SOLICITACAO_RECUSADA ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Solicitação recusada.</Text>
          ) : null}

          {erroAcao ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
              {erroAcao}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void tocarRemover()}
            disabled={removendo}
            accessibilityRole="button"
            accessibilityLabel="Remover notificação"
            hitSlop={8}
            style={{ alignSelf: "flex-end", minHeight: theme.sizes.touchTarget, justifyContent: "center", paddingHorizontal: theme.spacing.xs }}
          >
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{removendo ? "Removendo…" : "Remover"}</Text>
          </Pressable>
        </Card>
      </Pressable>
    </View>
  );
}
