import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, ScreenContainer, ScreenHeader } from "../components/ui";
import { FeedService } from "../feed";
import type { FeedComentarioEvento, FeedCurtidaEvento, FeedPostagemEvento, Postagem } from "../feed";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { formatarTempoRelativo } from "../utils/tempoRelativo";

const LIMITE_POR_PAGINA = 10;

/** Qual busca de próxima página está em voo agora — só existe pra dar
 * feedback visual no rodapé (spinner) e pra desabilitar o botão de retry do
 * rodapé enquanto uma tentativa já está em andamento. A carga inicial usa seu
 * próprio estado (`carregandoInicial`), não este. */
type AcaoBusca = "proximaPagina" | "retry" | null;

/**
 * `Home` (a aba) precisa navegar para `NovaPostagem`/`PostagemDetail`, que
 * moram no Stack PAI (`AppStackParamList`), não dentro da própria tab — mesmo
 * padrão de `JobsScreen` (Fase 9).
 */
type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "Home">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Segundo módulo de conteúdo real do App (Fase 10) — substitui o placeholder
 * das fases anteriores. Feed é uma lista que só CRESCE (diferente de Vagas,
 * que "fecha" e por isso usa paginação clássica) — aqui a paginação é
 * incremental via `FlatList.onEndReached`, acumulando páginas num só array.
 */
export function HomeScreen({ navigation }: HomeScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  // Fase 26 (polish): puxar para atualizar — mesmo padrão já usado em
  // `MessagesScreen.tsx`/`NotificationsScreen.tsx`, faltava só aqui e em
  // `JobsScreen.tsx`. Estado PRÓPRIO (não reaproveita `carregandoInicial`):
  // o gesto de "puxar" mostra o indicador nativo do próprio `RefreshControl`,
  // nunca a tela cheia de carregamento — são dois lugares visuais diferentes
  // pro mesmo tipo de espera.
  const [atualizando, setAtualizando] = useState(false);
  const [buscandoProximaPagina, setBuscandoProximaPagina] = useState<AcaoBusca>(null);
  // Guarda de concorrência DE VERDADE — não pode ser o `useState` acima:
  // `onEndReached` pode disparar mais de uma vez seguida (Fase 10) DENTRO do
  // mesmo tick de eventos, antes de o React sequer re-renderizar com o
  // `setBuscandoProximaPagina` da primeira chamada. Uma checagem baseada só
  // em estado leria o valor ANTIGO nas chamadas seguintes e deixaria passar.
  // Um `ref` muda de valor de forma síncrona e imediata, então a segunda
  // chamada (mesmo tick) já vê o novo valor. `buscandoProximaPagina` (state)
  // continua existindo só para feedback visual (spinner, desabilitar o botão
  // de retry do rodapé) — nunca para a decisão de buscar ou não.
  const buscaEmVooRef = useRef(false);

  // Fase 20 (tempo real): "há publicações novas" nunca insere nada sozinho
  // na lista — um `feed:postagem` de criação é uma emissão GLOBAL (sem sala,
  // ver `types.ts`/`realtime/socket.js`), então poderia vir de alguém que o
  // filtro do backend nem mostraria pra este usuário; e mesmo quando é
  // visível, inserir direto no topo da lista já rolada quebraria a posição
  // de leitura de quem usa leitor de tela. Vira um aviso — só recarrega a
  // primeira página quando o próprio usuário toca nele (mesmo `recarregarDoInicio`
  // do "Tentar novamente", ação explícita).
  const [haNovasPublicacoes, setHaNovasPublicacoes] = useState(false);
  // Espelha `postagens` para o listener de socket ler o valor MAIS RECENTE
  // sem precisar recriar a inscrição a cada mudança de lista (o efeito de
  // socket abaixo roda só uma vez, `[]`) — mesmo problema que motivou
  // `buscaEmVooRef` acima, resolvido do mesmo jeito (ref, não dependência).
  const postagensRef = useRef<Postagem[]>([]);
  useEffect(() => {
    postagensRef.current = postagens;
  }, [postagens]);

  /** Concatena uma nova página deduplicando por `id` — o backend nunca foi
   * observado repetindo um item entre páginas, mas não se presume isso. */
  function acumularPagina(pagina0: Postagem[], novas: Postagem[]): Postagem[] {
    const idsExistentes = new Set(pagina0.map((postagem) => postagem.id));
    return [...pagina0, ...novas.filter((postagem) => !idsExistentes.has(postagem.id))];
  }

  // Busca da MONTAGEM: função declarada dentro do próprio efeito (mesmo
  // padrão de `AuthProvider.tsx`/`JobsScreen.tsx`) — evita o lint
  // `react-hooks/set-state-in-effect` que uma função externa chamada por um
  // efeito dispararia.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await FeedService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setPostagens(resposta.postagens);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar o feed."));
      } finally {
        if (!cancelado) {
          setCarregandoInicial(false);
        }
      }
    }

    void carregarInicial();
    return () => {
      cancelado = true;
    };
  }, []);

  /**
   * Refaz a primeira página — usada pelo "Tentar novamente" de tela cheia,
   * pelo aviso de "novas publicações" e agora (Fase 26) por puxar para
   * atualizar. `comoAtualizacao` escolhe QUAL indicador visual usar (mesma
   * distinção de `MessagesScreen.tsx`/`NotificationsScreen.tsx`): o gesto de
   * puxar já mostra o próprio spinner nativo do `RefreshControl`, então não
   * faz sentido troca a tela inteira por um carregamento de tela cheia por
   * cima disso.
   */
  const recarregarDoInicio = useCallback(async (comoAtualizacao: boolean) => {
    if (comoAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregandoInicial(true);
    }
    setErro(null);
    setHaNovasPublicacoes(false);
    try {
      const resposta = await FeedService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
      setPostagens(resposta.postagens);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar o feed."));
    } finally {
      if (comoAtualizacao) {
        setAtualizando(false);
      } else {
        setCarregandoInicial(false);
      }
    }
  }, []);

  // Tempo real (Fase 20): inscreve UMA VEZ (`[]`) — lê a lista atual via
  // `postagensRef`, nunca via `postagens` direto (evitaria recriar a
  // inscrição a cada página carregada). `feed:curtida`/`feed:comentario`
  // aplicam a contagem do payload DIRETO (números não-sensíveis, ver
  // `types.ts`); `feed:postagem` nunca confia no payload além do
  // `id`/flag — sempre revalida via REST antes de mudar o que a tela
  // mostra (`atualizada`) ou só remove localmente o que o backend já
  // confirmou (por outro meio, `garantirAcessoAPostagem`) que existiu
  // (`removida`).
  useEffect(() => {
    const limparPostagem = ouvirEvento<FeedPostagemEvento>("feed:postagem", (evento) => {
      if (evento.criada) {
        setHaNovasPublicacoes(true);
        return;
      }

      const jaCarregada = postagensRef.current.some((postagem) => postagem.id === evento.id);
      if (!jaCarregada) return;

      if (evento.removida) {
        setPostagens((atual) => atual.filter((postagem) => postagem.id !== evento.id));
        return;
      }

      // `atualizada`: busca de novo via REST (reautoriza do zero) — nunca
      // troca o item por dado nenhum vindo do socket.
      FeedService.obterPorId(evento.id)
        .then((atualizada) => {
          setPostagens((atual) => atual.map((postagem) => (postagem.id === evento.id ? atualizada : postagem)));
        })
        .catch(() => {
          // Falha aqui (rede momentânea, ou a postagem deixou de estar
          // acessível entre o evento e a revalidação) não é crítica o
          // bastante pra mostrar erro — o item só continua mostrando a
          // versão anterior, mesma filosofia de curtir/comentar silencioso.
        });
    });

    const limparCurtida = ouvirEvento<FeedCurtidaEvento>("feed:curtida", (evento) => {
      setPostagens((atual) =>
        atual.map((postagem) =>
          postagem.id === evento.postagemId ? { ...postagem, totalCurtidas: evento.totalCurtidas } : postagem,
        ),
      );
    });

    const limparComentario = ouvirEvento<FeedComentarioEvento>("feed:comentario", (evento) => {
      setPostagens((atual) =>
        atual.map((postagem) =>
          postagem.id === evento.postagemId ? { ...postagem, totalComentarios: evento.totalComentarios } : postagem,
        ),
      );
    });

    return () => {
      limparPostagem();
      limparCurtida();
      limparComentario();
    };
  }, []);

  /**
   * Busca a página seguinte (scroll ou retry do rodapé). Só uma busca de
   * página fica em voo por vez — é essa checagem (não um debounce) que evita
   * múltiplas chamadas quando `onEndReached` dispara mais de uma vez durante
   * o mesmo scroll, e é o que torna a race condition "página 3 responde
   * antes da página 2" estruturalmente impossível aqui (nunca existe mais de
   * uma busca de página em voo ao mesmo tempo).
   */
  const buscarProximaPagina = useCallback(
    async (acao: "proximaPagina" | "retry") => {
      if (carregandoInicial || buscaEmVooRef.current) return;
      if (pagina >= totalPaginas) return;

      buscaEmVooRef.current = true;
      setBuscandoProximaPagina(acao);
      setErro(null);
      try {
        const proxima = pagina + 1;
        const resposta = await FeedService.listar({ page: proxima, limit: LIMITE_POR_PAGINA });
        // Erro numa página posterior preserva as anteriores — só o bloco de
        // sucesso sobrescreve `postagens`/`pagina`/`totalPaginas`.
        setPostagens((atual) => acumularPagina(atual, resposta.postagens));
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar mais publicações."));
      } finally {
        buscaEmVooRef.current = false;
        setBuscandoProximaPagina(null);
      }
    },
    [carregandoInicial, pagina, totalPaginas],
  );

  // Fase 25 (performance): `useCallback` aqui não é só estilo — é o que
  // torna o `React.memo` de `PostagemListItem` (abaixo) capaz de pular
  // linhas que não mudaram. Sem isso, `renderItem` passaria uma função NOVA
  // pra cada item a cada render do `HomeScreen` (mesmo indiretamente, por
  // essas serem recriadas), invalidando o memo sempre — o item ganharia o
  // "objeto" estável de `postagens.map(...)` (já preservado por identidade
  // desde a Fase 10), mas perderia a estabilidade logo em seguida por causa
  // dos callbacks. `[navigation]` é a única dependência real das duas
  // primeiras — a referência do objeto de navegação já é estável durante a
  // vida da tela (garantia do próprio React Navigation).
  const abrirDetalhe = useCallback(
    (postagemId: string) => {
      navigation.navigate("PostagemDetail", { postagemId });
    },
    [navigation],
  );

  function abrirNovaPostagem() {
    navigation.navigate("NovaPostagem");
  }

  const abrirPerfil = useCallback(
    (usuarioId: string) => {
      navigation.navigate("PublicProfile", { usuarioId });
    },
    [navigation],
  );

  const curtirNaLista = useCallback(async (postagemId: string) => {
    try {
      const { curtido, totalCurtidas } = await FeedService.alternarCurtida(postagemId);
      setPostagens((atual) =>
        atual.map((postagem) =>
          postagem.id === postagemId ? { ...postagem, curtidoPorMim: curtido, totalCurtidas } : postagem,
        ),
      );
    } catch {
      // Sem optimistic update (decisão desta fase): se a chamada falhar, o
      // botão simplesmente não muda de estado — só volta a ficar habilitado
      // (`PostagemListItem` espera esta Promise resolver antes de destravar
      // o próprio botão). Erro silencioso aqui é aceitável porque curtir não
      // é uma ação crítica (diferente de publicar/comentar, que sempre
      // mostram mensagem de erro ao usuário).
    }
    // `setPostagens` é estável por garantia do próprio React (`useState`) — sem outras dependências reais.
  }, []);

  // Fase 10: primeiro carregamento é tela cheia de loading, sem lista nenhuma
  // por baixo — mesmo padrão de `JobsScreen`.
  if (carregandoInicial) {
    return <LoadingState />;
  }

  // Erro logo no primeiro carregamento (nunca chegou a ter nenhuma publicação) — tela cheia de erro, diferente do erro de uma página seguinte (abaixo).
  if (erro && postagens.length === 0) {
    return (
      <ErrorState
        title="Não foi possível carregar o feed"
        message={erro}
        onRetry={() => void recarregarDoInicio(false)}
      />
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        testID="feed-lista"
        data={postagens}
        keyExtractor={(postagem) => postagem.id}
        // Fase 25 (performance) — itens desta lista são cartões com
        // possível imagem (mais pesados que uma linha de texto simples);
        // reduzir quanto fica montado fora da tela custa menos memória sem
        // afetar o scroll perceptível (valores recomendados pela própria
        // documentação de performance de listas do React Native, nunca
        // medidos num aparelho real nesta sessão — ver relatório da fase).
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void recarregarDoInicio(true)}
            colors={[theme.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <ScreenHeader title={`Olá, ${user?.nome ?? "tudo bem"}!`} tone="brand" />
            <Pressable
              onPress={abrirNovaPostagem}
              accessibilityRole="button"
              accessibilityLabel="Criar nova publicação"
              android_ripple={{ color: theme.colors.divider }}
              style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}
            >
              <Card elevation="sm" style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center" }}>
                <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
                  O que você está pensando?
                </Text>
              </Card>
            </Pressable>

            {haNovasPublicacoes ? (
              <Pressable
                // `true` (não `false`): a lista já está carregada e visível
                // aqui — o mesmo tratamento de "puxar para atualizar"
                // (spinner do `RefreshControl`, lista intacta enquanto
                // busca) encaixa melhor que trocar a tela inteira por um
                // carregamento de tela cheia por cima do que já tinha.
                onPress={() => void recarregarDoInicio(true)}
                accessibilityRole="button"
                accessibilityLabel="Novas publicações disponíveis. Toque para atualizar o feed."
                accessibilityLiveRegion="polite"
                android_ripple={{ color: theme.colors.primary.soft }}
                style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}
              >
                <Card
                  elevation="sm"
                  style={{
                    minHeight: theme.sizes.touchTarget,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: theme.colors.primary.soft,
                  }}
                >
                  <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>
                    Novas publicações · Toque para ver
                  </Text>
                </Card>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhuma publicação ainda"
            description="Seja a primeira pessoa a publicar algo no feed do ACESSO."
          />
        }
        renderItem={({ item }) => (
          // `onPress`/`onCurtir` passados DIRETO (não `() => abrirDetalhe(item.id)`)
          // — a mesma razão de `onAbrirPerfil` já estar assim: uma closure nova
          // por item a cada render invalidaria o `React.memo` de
          // `PostagemListItem` mesmo com os handlers já estáveis acima. O
          // próprio item chama `onPress(postagem.id)`/`onCurtir(postagem.id)`.
          <PostagemListItem postagem={item} theme={theme} onPress={abrirDetalhe} onCurtir={curtirNaLista} onAbrirPerfil={abrirPerfil} />
        )}
        ListFooterComponent={
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {buscandoProximaPagina === "proximaPagina" ? (
              <ActivityIndicator color={theme.colors.primary.solid} />
            ) : null}
            {/* Erro de uma página seguinte — a lista acima continua visível, só isto aparece junto (Fase 9 já estabeleceu esse padrão em JobsScreen). */}
            {erro && postagens.length > 0 ? (
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
                Você chegou ao fim do feed.
              </Text>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

/** Função local, não exportada — só `HomeScreen` consome. `src/feed/` fica
 * flat (igual `src/vagas/`), sem subpasta `components/`, mesmo raciocínio de
 * `VagaListItem`. */
/**
 * `React.memo` (Fase 25, performance): sem isso, curtir UMA publicação
 * (`setPostagens` trocando só o item afetado por um objeto novo, Fase 10)
 * ainda re-renderizava TODAS as linhas visíveis — o array `postagens` em si
 * já é uma referência nova a cada `setState`, e o `FlatList` reavalia
 * `renderItem` pra cada linha montada nesse momento. Com o memo (e os
 * handlers estabilizados por `useCallback` em `HomeScreen`, mais
 * `onPress`/`onCurtir` recebendo o handler direto em vez de uma closure por
 * item), só a linha cujo objeto `postagem` realmente mudou reprocessa —
 * as outras têm TODAS as props (`===`) iguais ao render anterior.
 */
const PostagemListItem = memo(function PostagemListItem({
  postagem,
  theme,
  onPress,
  onCurtir,
  onAbrirPerfil,
}: {
  postagem: Postagem;
  theme: Theme;
  onPress: (postagemId: string) => void;
  onCurtir: (postagemId: string) => Promise<void>;
  onAbrirPerfil: (usuarioId: string) => void;
}) {
  const autor = postagem.usuario ?? postagem.autor;
  const nomeAutor = autor?.nome ?? "Usuário do ACESSO";
  const [curtindo, setCurtindo] = useState(false);

  async function tocarCurtir() {
    if (curtindo) return;
    setCurtindo(true);
    try {
      await onCurtir(postagem.id);
    } finally {
      setCurtindo(false);
    }
  }

  const tempo = formatarTempoRelativo(postagem.created_at);

  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(postagem.id)}
        accessibilityRole="button"
        accessibilityLabel={`Publicação de ${nomeAutor}${tempo ? `, ${tempo}` : ""}`}
        android_ripple={{ color: theme.colors.divider }}
      >
        <Card elevation="sm" style={{ gap: theme.spacing.sm, padding: theme.spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            {/* Nested Pressable dentro do card inteiro (mesma técnica já usada
                pelo botão de curtir): tocar no autor abre o perfil dele, sem
                abrir o detalhe da publicação — o sistema de resposta do RN já
                garante que só o Pressable mais interno recebe o toque. */}
            <Pressable
              onPress={() => autor?.id && onAbrirPerfil(autor.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${nomeAutor}`}
              disabled={!autor?.id}
              style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flex: 1, minWidth: 0 }}
              // Rodada 3, item 8 — mesmo gap de 48dp corrigido em
              // `DiscoverScreen.tsx` (avatar de 40dp como área de toque).
              hitSlop={4}
            >
              <Avatar nome={autor?.nome} fotoUrl={autor?.fotoPerfil} size="medium" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {nomeAutor}
                </Text>
                {tempo ? (
                  <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{tempo}</Text>
                ) : null}
              </View>
            </Pressable>
          </View>

          {postagem.conteudo ? (
            <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={6}>
              {postagem.conteudo}
            </Text>
          ) : null}

          <AnexoResumo postagem={postagem} theme={theme} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "stretch",
              gap: theme.spacing.sm,
              marginTop: theme.spacing.xs,
              paddingTop: theme.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.colors.divider,
            }}
          >
            <Pressable
              onPress={() => void tocarCurtir()}
              disabled={curtindo}
              accessibilityRole="button"
              accessibilityLabel={postagem.curtidoPorMim ? "Descurtir" : "Curtir"}
              accessibilityState={{ selected: postagem.curtidoPorMim, disabled: curtindo }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: theme.sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.xs,
                borderRadius: theme.radius.md,
                backgroundColor: postagem.curtidoPorMim ? theme.colors.primary.soft : pressed ? theme.colors.divider : "transparent",
              })}
            >
              {/* Bloco 9 (auditoria de contraste pós-redesign) — mesmo achado
                  do ícone ativo em `AppTabs.tsx`: sobre o fundo `soft` deste
                  pill, o ícone precisa de `onSoft` (o par certo, já usado no
                  texto "Curtido" logo abaixo), não `solid` — `solid` sobre
                  `soft` mede só 2.66:1 no tema claro, abaixo do mínimo de
                  3:1 do WCAG 1.4.11 para componentes gráficos. */}
              <Ionicons
                name={postagem.curtidoPorMim ? "heart" : "heart-outline"}
                size={theme.sizes.iconMedium}
                color={postagem.curtidoPorMim ? theme.colors.primary.onSoft : theme.colors.textSecondary}
              />
              <Text
                style={[
                  theme.typography.bodySmall,
                  {
                    fontWeight: postagem.curtidoPorMim ? "700" : "400",
                    color: postagem.curtidoPorMim ? theme.colors.primary.onSoft : theme.colors.textSecondary,
                  },
                ]}
              >
                {postagem.curtidoPorMim ? "Curtido" : "Curtir"}
                {postagem.totalCurtidas > 0 ? ` · ${postagem.totalCurtidas}` : ""}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onPress(postagem.id)}
              accessibilityRole="button"
              accessibilityLabel={
                postagem.totalComentarios > 0
                  ? `Abrir comentários. ${postagem.totalComentarios} comentário${postagem.totalComentarios === 1 ? "" : "s"}.`
                  : "Comentar"
              }
              style={({ pressed }) => ({
                flex: 1,
                minHeight: theme.sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.xs,
                borderRadius: theme.radius.md,
                backgroundColor: pressed ? theme.colors.divider : "transparent",
              })}
            >
              <Ionicons name="chatbubble-outline" size={theme.sizes.iconMedium} color={theme.colors.textSecondary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {postagem.totalComentarios > 0
                  ? `${postagem.totalComentarios} coment${postagem.totalComentarios === 1 ? "ário" : "ários"}`
                  : "Comentar"}
              </Text>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    </View>
  );
});

/**
 * Resumo dos anexos no CARTÃO da lista (Fase 20) — só o PRIMEIRO anexo (o
 * conjunto completo, com descrição/lightbox, fica para `PostagemDetailScreen`;
 * mesma distinção "resumo na lista, riqueza no detalhe" que `VagaListItem`/
 * `VagaDetailScreen` já usam). `accessibilityLabel` vem da descrição
 * acessível real do anexo — nunca omitida, nunca gerada aqui: quando o autor
 * não escreveu nenhuma, um leitor de tela ainda precisa saber que HÁ uma
 * imagem, só sem descrição (em vez de a imagem simplesmente não existir para
 * quem usa voz).
 */
function AnexoResumo({ postagem, theme }: { postagem: Postagem; theme: Theme }) {
  const anexos = postagem.anexos ?? [];
  if (anexos.length === 0) return null;

  const primeiro = anexos[0];
  if (!primeiro) return null;

  if (primeiro.tipo !== "imagem") {
    const rotulo = primeiro.tipo === "video" ? "Vídeo anexado" : "Arquivo anexado";
    return (
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
        {anexos.length > 1 ? `${rotulo} · +${anexos.length - 1}` : rotulo}
      </Text>
    );
  }

  return (
    <View>
      <Image
        // `expo-image` (Fase 25), não o `Image` do react-native: a URL
        // assinada muda a cada busca (Fase 7, `assinarMidiaDasPostagens`),
        // então cachear pela URL (comportamento padrão de qualquer
        // componente de imagem) forçaria um novo download toda vez que a
        // publicação for re-buscada, mesmo sendo o MESMO arquivo — `cacheKey`
        // fixo no `id` do anexo resolve isso, sem precisar de nada no backend.
        source={{ uri: primeiro.url, cacheKey: primeiro.id }}
        accessible
        accessibilityLabel={primeiro.descricao || "Imagem anexada à publicação, sem descrição informada."}
        style={{ width: "100%", height: 180, borderRadius: theme.radius.md, backgroundColor: theme.colors.divider }}
        contentFit="cover"
      />
      {anexos.length > 1 ? (
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
          +{anexos.length - 1} {anexos.length - 1 === 1 ? "anexo" : "anexos"}
        </Text>
      ) : null}
    </View>
  );
}
