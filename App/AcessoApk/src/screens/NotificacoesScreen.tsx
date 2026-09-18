import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { NotificacaoService } from "../notificacoes";
import type { Notificacao } from "../notificacoes";
import { Avatar, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela, CabecalhoTela } from "../components/ui";
import type { AppStackParamList, AbasParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { SeguidorService } from "../seguidores";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const LIMITE_POR_PAGINA = 15;

type AcaoBusca = "proximaPagina" | "retry" | null;

/**
 * `Notifications` (a aba) precisa navegar para `PublicProfile`, `PostagemDetail` e `VagaDetail`,
 * que ficam no stack pai (`AppStackParamList`), e não dentro da própria aba, como em `FeedScreen` e
 * `VagasScreen`.
 */
type NotificationsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AbasParamList, "Notifications">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Central de notificações, com a paginação incremental do feed (lista que só cresce, uma busca de
 * página por vez) e com puxar para atualizar, porque ver o que chegou desde a última visita é o
 * motivo da tela existir.
 */
export function NotificacoesScreen({ navigation }: NotificationsScreenProps) {
  const { tema } = useTema();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [buscandoProximaPagina, setBuscandoProximaPagina] = useState<AcaoBusca>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  // Guarda de concorrência de verdade (não `useState`), pelo mesmo raciocínio de
  // `FeedScreen`: `onEndReached` pode disparar mais de uma vez no mesmo tick.
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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas notificações."));
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas notificações."));
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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar mais notificações."));
      } finally {
        buscaEmVooRef.current = false;
        setBuscandoProximaPagina(null);
      }
    },
    [carregandoInicial, pagina, totalPaginas],
  );

  // Os handlers passados ao `NotificacaoItem` memoizado ficam estáveis com `useCallback`; senão,
  // cada atualização ou página passaria funções novas e invalidaria o memo de todas as linhas (ver
  // `FeedScreen.tsx`).
  const atualizarNaLista = useCallback((id: string, alteracoes: Partial<Notificacao>) => {
    setNotificacoes((atual) => atual.map((notificacao) => (notificacao.id === id ? { ...notificacao, ...alteracoes } : notificacao)));
  }, []);

  const removerDaLista = useCallback((id: string) => {
    setNotificacoes((atual) => atual.filter((notificacao) => notificacao.id !== id));
    setTotal((atual) => Math.max(0, atual - 1));
  }, []);

  /**
   * Só os `entidadeTipo` com tela correspondente navegam. Os demais (conversa, comentário, empresa,
   * denúncia) apenas marcam como lida ao tocar (ver `notificacoes/types.ts`).
   */
  const navegarSePossivel = useCallback(
    (notificacao: Notificacao) => {
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
          // Sem tela de "solicitação", mas o ator (quem pediu pra seguir) tem
          // perfil visível, então o toque no corpo do card leva até ele.
          if (notificacao.ator) navigation.navigate("PublicProfile", { usuarioId: notificacao.ator.id });
          return;
        default:
          return;
      }
    },
    [navigation],
  );

  const marcarComoLidaEmSegundoPlano = useCallback(
    async (id: string) => {
      try {
        await NotificacaoService.marcarComoLida(id);
        atualizarNaLista(id, { lida: true });
      } catch {
        // Estado de "lida" não é crítico (mesmo raciocínio do curtir em
        // `FeedScreen`): uma falha aqui não deve incomodar quem só queria ver
        // o conteúdo. A notificação continua marcada como não lida na lista;
        // a próxima ação sobre ela tenta de novo.
      }
    },
    [atualizarNaLista],
  );

  const abrirNotificacao = useCallback(
    (notificacao: Notificacao) => {
      if (!notificacao.lida) {
        void marcarComoLidaEmSegundoPlano(notificacao.id);
      }
      navegarSePossivel(notificacao);
    },
    [marcarComoLidaEmSegundoPlano, navegarSePossivel],
  );

  async function marcarTodasComoLidas() {
    if (marcandoTodas) return;
    setMarcandoTodas(true);
    try {
      await NotificacaoService.marcarTodasComoLidas();
      setNotificacoes((atual) => atual.map((notificacao) => ({ ...notificacao, lida: true })));
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível marcar tudo como lido agora."));
    } finally {
      setMarcandoTodas(false);
    }
  }

  const removerNotificacao = useCallback(
    async (id: string) => {
      try {
        await NotificacaoService.remover(id);
        removerDaLista(id);
      } catch {
        // Sem mensagem bloqueante: a linha simplesmente continua ali, quem
        // tentou pode tocar em "Remover" de novo.
      }
    },
    [removerDaLista],
  );

  const aceitarSolicitacao = useCallback(
    async (notificacao: Notificacao) => {
      if (!notificacao.entidadeId) return;
      await SeguidorService.aceitarSolicitacao(notificacao.entidadeId);
      atualizarNaLista(notificacao.id, { lida: true, subtipo: "solicitacao_seguimento_resolvida_aceita" });
      void marcarComoLidaEmSegundoPlano(notificacao.id);
    },
    [atualizarNaLista, marcarComoLidaEmSegundoPlano],
  );

  const recusarSolicitacao = useCallback(
    async (notificacao: Notificacao) => {
      if (!notificacao.entidadeId) return;
      await SeguidorService.recusarSolicitacao(notificacao.entidadeId);
      atualizarNaLista(notificacao.id, { lida: true, subtipo: "solicitacao_seguimento_resolvida_recusada" });
      void marcarComoLidaEmSegundoPlano(notificacao.id);
    },
    [atualizarNaLista, marcarComoLidaEmSegundoPlano],
  );

  const existeNaoLida = notificacoes.some((notificacao) => !notificacao.lida);

  if (carregandoInicial) {
    return <EstadoCarregamento />;
  }

  if (erro && notificacoes.length === 0) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar suas notificações"
        mensagem={erro}
        onTentarNovamente={() => void recarregarDoInicio(false)}
      />
    );
  }

  return (
    <ContainerTela>
      <CabecalhoTela titulo="Notificações" style={{ marginBottom: tema.spacing.sm }} />
      <FlatList
        testID="notificacoes-lista"
        data={notificacoes}
        keyExtractor={(notificacao) => notificacao.id}
        // Mesmo ajuste do `FeedScreen.tsx`, onde está o motivo.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: tema.spacing.sm, paddingVertical: tema.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        refreshControl={
          <RefreshControl
            testID="notificacoes-refresh"
            refreshing={atualizando}
            onRefresh={() => void recarregarDoInicio(true)}
            colors={[tema.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          existeNaoLida ? (
            <View style={{ alignItems: "flex-end", marginBottom: tema.spacing.sm }}>
              <Botao variant="ghost" size="small" onPress={() => void marcarTodasComoLidas()} carregando={marcandoTodas} disabled={marcandoTodas}>
                Marcar todas como lidas
              </Botao>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo="Nenhuma notificação ainda"
            descricao="Curtidas, comentários, novos seguidores e outras novidades vão aparecer aqui."
          />
        }
        renderItem={({ item }) => (
          // Handlers passados direto (estáveis por `useCallback`): o item chama
          // cada um com a notificação/id que precisa. Ver `FeedScreen.tsx`.
          <NotificacaoItem
            notificacao={item}
            tema={tema}
            onAbrir={abrirNotificacao}
            onAceitar={aceitarSolicitacao}
            onRecusar={recusarSolicitacao}
            onRemover={removerNotificacao}
          />
        )}
        ListFooterComponent={
          <View style={{ gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
            {buscandoProximaPagina === "proximaPagina" ? <ActivityIndicator color={tema.colors.primary.solid} /> : null}
            {erro && notificacoes.length > 0 ? (
              <View style={{ gap: tema.spacing.xs }}>
                <Text
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  style={[tema.typography.caption, { color: tema.colors.error.solid }]}
                >
                  {erro}
                </Text>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void buscarProximaPagina("retry")}
                  carregando={buscandoProximaPagina === "retry"}
                  disabled={buscandoProximaPagina !== null}
                >
                  Tentar novamente
                </Botao>
              </View>
            ) : null}
            {total > 0 && pagina >= totalPaginas && !erro ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted, textAlign: "center" }]}>
                Você chegou ao fim das notificações.
              </Text>
            ) : null}
          </View>
        }
      />
    </ContainerTela>
  );
}

function formatarDiaMesHora(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(data);
}

const SOLICITACAO_ACEITA = "solicitacao_seguimento_resolvida_aceita";
const SOLICITACAO_RECUSADA = "solicitacao_seguimento_resolvida_recusada";

/**
 * Notificação na lista, com `memo`: cada handler recebe a notificação ou o id como parâmetro e o
 * pai os mantém estáveis, então marcar ou remover uma notificação não renderiza as outras de novo.
 */
const NotificacaoItem = memo(function NotificacaoItem({
  notificacao,
  tema,
  onAbrir,
  onAceitar,
  onRecusar,
  onRemover,
}: {
  notificacao: Notificacao;
  tema: Tema;
  onAbrir: (notificacao: Notificacao) => void;
  onAceitar: (notificacao: Notificacao) => Promise<void>;
  onRecusar: (notificacao: Notificacao) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
}) {
  const [resolvendo, setResolvendo] = useState<"aceitar" | "recusar" | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const solicitacaoPendente = notificacao.subtipo === "solicitacao_seguimento";

  async function tocarAceitar() {
    if (resolvendo) return;
    setResolvendo("aceitar");
    setErroAcao(null);
    try {
      await onAceitar(notificacao);
    } catch (erro) {
      setErroAcao(extrairMensagemErro(erro, "Não foi possível aceitar agora."));
    } finally {
      setResolvendo(null);
    }
  }

  async function tocarRecusar() {
    if (resolvendo) return;
    setResolvendo("recusar");
    setErroAcao(null);
    try {
      await onRecusar(notificacao);
    } catch (erro) {
      setErroAcao(extrairMensagemErro(erro, "Não foi possível recusar agora."));
    } finally {
      setResolvendo(null);
    }
  }

  async function tocarRemover() {
    if (removendo) return;
    setRemovendo(true);
    try {
      await onRemover(notificacao.id);
    } finally {
      setRemovendo(false);
    }
  }

  const rotuloAcessibilidade = `${notificacao.lida ? "" : "Não lida. "}${notificacao.titulo}${notificacao.descricao ? `. ${notificacao.descricao}` : ""}`;

  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onAbrir(notificacao)}
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessibilidade}
        android_ripple={{ color: tema.colors.divider }}
      >
        <Cartao
          elevacao="sm"
          style={{
            gap: tema.spacing.xs,
            borderLeftWidth: notificacao.lida ? 0 : 3,
            borderLeftColor: tema.colors.primary.solid,
          }}
        >
          <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
            {notificacao.ator ? (
              <Avatar nome={notificacao.ator.nome} fotoUrl={notificacao.ator.fotoPerfil} size="small" />
            ) : (
              // Aviso do sistema, sem ator: `Avatar` sempre cai para
              // iniciais ("?"), o que aqui apagaria a distinção visual
              // entre "isto é de uma pessoa" e "isto é um aviso do
              // sistema". Mantido à parte de propósito, não uma duplicação
              // esquecida.
              <View
                accessible={false}
                style={{
                  width: tema.sizes.avatarSmall,
                  height: tema.sizes.avatarSmall,
                  borderRadius: tema.sizes.avatarSmall / 2,
                  backgroundColor: tema.colors.primary.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[tema.typography.caption, { color: tema.colors.primary.onSoft }]}>🔔</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[tema.typography.label, { color: tema.colors.textPrimary, fontWeight: notificacao.lida ? "400" : "700" }]}
                numberOfLines={2}
              >
                {notificacao.titulo}
              </Text>
              {notificacao.descricao ? (
                <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]} numberOfLines={3}>
                  {notificacao.descricao}
                </Text>
              ) : null}
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{formatarDiaMesHora(notificacao.criadoEm)}</Text>
            </View>
          </View>

          {solicitacaoPendente ? (
            <View style={{ flexDirection: "row", gap: tema.spacing.sm, marginTop: tema.spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Botao size="small" onPress={() => void tocarAceitar()} carregando={resolvendo === "aceitar"} disabled={resolvendo !== null}>
                  Aceitar
                </Botao>
              </View>
              <View style={{ flex: 1 }}>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void tocarRecusar()}
                  carregando={resolvendo === "recusar"}
                  disabled={resolvendo !== null}
                >
                  Recusar
                </Botao>
              </View>
            </View>
          ) : null}

          {notificacao.subtipo === SOLICITACAO_ACEITA ? (
            <Text style={[tema.typography.caption, { color: tema.colors.success.solid }]}>Solicitação aceita.</Text>
          ) : null}
          {notificacao.subtipo === SOLICITACAO_RECUSADA ? (
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>Solicitação recusada.</Text>
          ) : null}

          {erroAcao ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
              {erroAcao}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void tocarRemover()}
            disabled={removendo}
            accessibilityRole="button"
            accessibilityLabel="Remover notificação"
            hitSlop={8}
            style={{ alignSelf: "flex-end", minHeight: tema.sizes.touchTarget, justifyContent: "center", paddingHorizontal: tema.spacing.xs }}
          >
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{removendo ? "Removendo…" : "Remover"}</Text>
          </Pressable>
        </Cartao>
      </Pressable>
    </View>
  );
});
