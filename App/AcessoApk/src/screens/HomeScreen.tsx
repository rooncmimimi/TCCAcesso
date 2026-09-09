import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { Button, Card, ScreenContainer } from "../components/ui";
import { FeedService } from "../feed";
import type { FeedComentarioEvento, FeedCurtidaEvento, FeedPostagemEvento, Postagem } from "../feed";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

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

  /** Refaz só a carga inicial (usada pelo "Tentar novamente" de tela cheia e pelo aviso de "novas publicações" — não há nada prévio pra preservar em nenhum dos dois casos). */
  const recarregarDoInicio = useCallback(async () => {
    setCarregandoInicial(true);
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
      setCarregandoInicial(false);
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

  function abrirDetalhe(postagemId: string) {
    navigation.navigate("PostagemDetail", { postagemId });
  }

  function abrirNovaPostagem() {
    navigation.navigate("NovaPostagem");
  }

  function abrirPerfil(usuarioId: string) {
    navigation.navigate("PublicProfile", { usuarioId });
  }

  async function curtirNaLista(postagemId: string) {
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
  }

  // Fase 10: primeiro carregamento é tela cheia de loading, sem lista nenhuma
  // por baixo — mesmo padrão de `JobsScreen`.
  if (carregandoInicial) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  // Erro logo no primeiro carregamento (nunca chegou a ter nenhuma publicação) — tela cheia de erro, diferente do erro de uma página seguinte (abaixo).
  if (erro && postagens.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar o feed
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={() => void recarregarDoInicio()}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        testID="feed-lista"
        data={postagens}
        keyExtractor={(postagem) => postagem.id}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        ListHeaderComponent={
          <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <Text style={[theme.typography.heading, { color: theme.colors.primary.solid }]}>
              Olá, {user?.nome ?? "tudo bem"}!
            </Text>
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
                onPress={() => void recarregarDoInicio()}
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
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
              Nenhuma publicação ainda
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Seja a primeira pessoa a publicar algo no feed do ACESSO.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <PostagemListItem
            postagem={item}
            theme={theme}
            onPress={() => abrirDetalhe(item.id)}
            onCurtir={() => curtirNaLista(item.id)}
            onAbrirPerfil={abrirPerfil}
          />
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

/** Iniciais de um nome — 1 ou 2 letras (primeiro nome + último, quando há
 * mais de um). Mesmo cálculo simples que qualquer avatar-por-iniciais usa;
 * não existe componente de avatar pronto no app ainda (Fase 10, sem foto real). */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

/** Função local, não exportada — só `HomeScreen` consome. `src/feed/` fica
 * flat (igual `src/vagas/`), sem subpasta `components/`, mesmo raciocínio de
 * `VagaListItem`. */
function PostagemListItem({
  postagem,
  theme,
  onPress,
  onCurtir,
  onAbrirPerfil,
}: {
  postagem: Postagem;
  theme: Theme;
  onPress: () => void;
  onCurtir: () => Promise<void>;
  onAbrirPerfil: (usuarioId: string) => void;
}) {
  const autor = postagem.usuario ?? postagem.autor;
  const nomeAutor = autor?.nome ?? "Usuário do ACESSO";
  const [curtindo, setCurtindo] = useState(false);

  async function tocarCurtir() {
    if (curtindo) return;
    setCurtindo(true);
    try {
      await onCurtir();
    } finally {
      setCurtindo(false);
    }
  }

  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Publicação de ${nomeAutor}`}
        android_ripple={{ color: theme.colors.divider }}
      >
        <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
          {/* Nested Pressable dentro do card inteiro (mesma técnica já usada
              pelo botão de curtir): tocar no autor abre o perfil dele, sem
              abrir o detalhe da publicação — o sistema de resposta do RN já
              garante que só o Pressable mais interno recebe o toque. */}
          <Pressable
            onPress={() => autor?.id && onAbrirPerfil(autor.id)}
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de ${nomeAutor}`}
            disabled={!autor?.id}
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
              <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>
                {iniciaisDoNome(autor?.nome)}
              </Text>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {nomeAutor}
            </Text>
          </Pressable>

          {postagem.conteudo ? (
            <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={6}>
              {postagem.conteudo}
            </Text>
          ) : null}

          <AnexoResumo postagem={postagem} theme={theme} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
            <Pressable
              onPress={() => void tocarCurtir()}
              disabled={curtindo}
              accessibilityRole="button"
              accessibilityLabel={postagem.curtidoPorMim ? "Descurtir" : "Curtir"}
              accessibilityState={{ selected: postagem.curtidoPorMim, disabled: curtindo }}
              hitSlop={10}
              style={{ minHeight: theme.sizes.touchTarget, flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}
            >
              <Text
                style={[
                  theme.typography.bodySmall,
                  { color: postagem.curtidoPorMim ? theme.colors.primary.solid : theme.colors.textSecondary },
                ]}
              >
                {postagem.curtidoPorMim ? "Curtido" : "Curtir"}
                {postagem.totalCurtidas > 0 ? ` · ${postagem.totalCurtidas}` : ""}
              </Text>
            </Pressable>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              {postagem.totalComentarios > 0
                ? `${postagem.totalComentarios} comentário${postagem.totalComentarios === 1 ? "" : "s"}`
                : "Comentar"}
            </Text>
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

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
        source={{ uri: primeiro.url }}
        accessible
        accessibilityLabel={primeiro.descricao || "Imagem anexada à publicação, sem descrição informada."}
        style={{ width: "100%", height: 180, borderRadius: theme.radius.md, backgroundColor: theme.colors.divider }}
        resizeMode="cover"
      />
      {anexos.length > 1 ? (
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginTop: theme.spacing.xs }]}>
          +{anexos.length - 1} {anexos.length - 1 === 1 ? "anexo" : "anexos"}
        </Text>
      ) : null}
    </View>
  );
}
