import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAutenticacao } from "../autenticacao";
import { Avatar, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela, CabecalhoTela } from "../components/ui";
import { FeedService } from "../feed";
import type { FeedComentarioEvento, FeedCurtidaEvento, FeedPostagemEvento, Postagem } from "../feed";
import type { AppStackParamList, AbasParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import { formatarTempoRelativo } from "../utils/formatacao";

const LIMITE_POR_PAGINA = 10;

/** Qual busca de próxima página está em voo agora: só existe pra dar
 * feedback visual no rodapé (spinner) e pra desabilitar o botão de retry do
 * rodapé enquanto uma tentativa já está em andamento. A carga inicial usa seu
 * próprio estado (`carregandoInicial`), não este. */
type AcaoBusca = "proximaPagina" | "retry" | null;

/**
 * `Home` (a aba) navega para `NovaPostagem` e `PostagemDetail`, que ficam na pilha pai
 * (`AppStackParamList`) e não na própria aba, como em `VagasScreen`.
 */
type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AbasParamList, "Home">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Feed de publicações. A lista só cresce, então a paginação é incremental (`onEndReached`),
 * acumulando as páginas num só array, diferente de Vagas, que pagina por página.
 */
export function FeedScreen({ navigation }: HomeScreenProps) {
  const { tema } = useTema();
  const { usuario } = useAutenticacao();

  const [postagens, setPostagens] = useState<Postagem[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  // Puxar para atualizar tem estado próprio: o gesto mostra o indicador do `RefreshControl`, e não
  // a tela cheia de carregamento.
  const [atualizando, setAtualizando] = useState(false);
  const [buscandoProximaPagina, setBuscandoProximaPagina] = useState<AcaoBusca>(null);
  // Trava de concorrência. Não pode ser o estado acima: `onEndReached` pode disparar várias vezes
  // no mesmo ciclo de eventos, antes de o React renderizar de novo, e uma checagem por estado leria
  // o valor antigo. A ref muda na hora, então a segunda chamada já vê a busca em andamento;
  // `buscandoProximaPagina` fica só para o retorno visual.
  const buscaEmVooRef = useRef(false);

  // Uma publicação nova nunca entra sozinha na lista. O `feed:postagem` de criação vai para todos
  // os clientes, sem sala, e pode ser de alguém que o backend nem mostraria para esta pessoa; além
  // disso, inserir no topo de uma lista já rolada tiraria quem usa leitor de tela do ponto de
  // leitura. Vira um aviso, e a primeira página só é recarregada quando a pessoa toca nele.
  const [haNovasPublicacoes, setHaNovasPublicacoes] = useState(false);
  // Espelha `postagens` para o listener de socket ler o valor mais recente
  // sem precisar recriar a inscrição a cada mudança de lista (o efeito de
  // socket abaixo roda só uma vez, `[]`): mesmo problema que motivou
  // `buscaEmVooRef` acima, resolvido do mesmo jeito (ref, não dependência).
  const postagensRef = useRef<Postagem[]>([]);
  useEffect(() => {
    postagensRef.current = postagens;
  }, [postagens]);

  /** Concatena uma nova página deduplicando por `id`: o backend nunca foi
   * observado repetindo um item entre páginas, mas não se presume isso. */
  function acumularPagina(pagina0: Postagem[], novas: Postagem[]): Postagem[] {
    const idsExistentes = new Set(pagina0.map((postagem) => postagem.id));
    return [...pagina0, ...novas.filter((postagem) => !idsExistentes.has(postagem.id))];
  }

  // Busca da montagem: função declarada dentro do próprio efeito (mesmo
  // padrão de `AutenticacaoProvider.tsx`/`VagasScreen.tsx`): evita o lint
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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar o feed."));
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
   * Recarrega a primeira página no "Tentar novamente" de tela cheia, no aviso de publicações novas
   * e ao puxar para atualizar. `comoAtualizacao` escolhe o indicador: ao puxar, o `RefreshControl`
   * já mostra o carregamento, então a tela não é trocada pelo carregamento de tela cheia.
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar o feed."));
    } finally {
      if (comoAtualizacao) {
        setAtualizando(false);
      } else {
        setCarregandoInicial(false);
      }
    }
  }, []);

  // Tempo real: a inscrição é feita uma vez (`[]`) e lê a lista por `postagensRef`, para não se
  // inscrever de novo a cada página. `feed:curtida` e `feed:comentario` aplicam a contagem do
  // payload direto (números sem dado sensível, ver `feed/types.ts`). `feed:postagem` só usa o `id`
  // e o marcador: atualização é recarregada pela API, e remoção só tira da tela o item que já
  // estava na lista.
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

      // `atualizada`: busca de novo via REST (reautoriza do zero); nunca
      // troca o item por dado nenhum vindo do socket.
      FeedService.obterPorId(evento.id)
        .then((atualizada) => {
          setPostagens((atual) => atual.map((postagem) => (postagem.id === evento.id ? atualizada : postagem)));
        })
        .catch(() => {
          // Falha aqui (rede momentânea, ou a postagem deixou de estar
          // acessível entre o evento e a revalidação) não é crítica o
          // bastante pra mostrar erro: o item só continua mostrando a
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
   * página fica em voo por vez: é essa checagem (não um debounce) que evita
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
        // Erro numa página posterior preserva as anteriores: só o bloco de
        // sucesso sobrescreve `postagens`/`pagina`/`totalPaginas`.
        setPostagens((atual) => acumularPagina(atual, resposta.postagens));
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar mais publicações."));
      } finally {
        buscaEmVooRef.current = false;
        setBuscandoProximaPagina(null);
      }
    },
    [carregandoInicial, pagina, totalPaginas],
  );

  // `useCallback` é o que permite ao `memo` de `ItemPostagem` pular linhas que não mudaram; sem
  // ele, cada render passaria funções novas e invalidaria o memo. `navigation` é a única
  // dependência, e sua referência é estável durante a vida da tela.
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
      // Sem atualização otimista: se a chamada falhar, o botão não muda e só volta a ficar
      // habilitado (`ItemPostagem` espera esta Promise para destravá-lo). O erro fica silencioso
      // porque curtir não é crítico, ao contrário de publicar e comentar, que sempre mostram a
      // mensagem.
    }
    // `setPostagens` é estável por garantia do próprio React (`useState`): sem outras dependências reais.
  }, []);

  // Primeira carga: tela cheia de carregamento, sem lista por baixo, como em `VagasScreen`.
  if (carregandoInicial) {
    return <EstadoCarregamento />;
  }

  // Erro logo no primeiro carregamento (nunca chegou a ter nenhuma publicação): tela cheia de erro, diferente do erro de uma página seguinte (abaixo).
  if (erro && postagens.length === 0) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar o feed"
        mensagem={erro}
        onTentarNovamente={() => void recarregarDoInicio(false)}
      />
    );
  }

  return (
    <ContainerTela>
      <FlatList
        testID="feed-lista"
        data={postagens}
        keyExtractor={(postagem) => postagem.id}
        // Os cartões podem ter imagem, então menos itens ficam montados fora da tela. São os
        // valores sugeridos na documentação de desempenho de listas do React Native, ainda não
        // medidos em aparelho.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: tema.spacing.sm, paddingVertical: tema.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void recarregarDoInicio(true)}
            colors={[tema.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: tema.spacing.sm, marginBottom: tema.spacing.sm }}>
            <CabecalhoTela titulo={`Olá, ${usuario?.nome ?? "tudo bem"}!`} tone="brand" />
            <Pressable
              onPress={abrirNovaPostagem}
              accessibilityRole="button"
              accessibilityLabel="Criar nova publicação"
              android_ripple={{ color: tema.colors.divider }}
              style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}
            >
              <Cartao elevacao="sm" style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center" }}>
                <Text style={[tema.typography.body, { color: tema.colors.textMuted }]}>
                  O que você está pensando?
                </Text>
              </Cartao>
            </Pressable>

            {haNovasPublicacoes ? (
              <Pressable
                // `true` (não `false`): a lista já está carregada e visível
                // aqui; o mesmo tratamento de "puxar para atualizar"
                // (spinner do `RefreshControl`, lista intacta enquanto
                // busca) encaixa melhor que trocar a tela inteira por um
                // carregamento de tela cheia por cima do que já tinha.
                onPress={() => void recarregarDoInicio(true)}
                accessibilityRole="button"
                accessibilityLabel="Novas publicações disponíveis. Toque para atualizar o feed."
                accessibilityLiveRegion="polite"
                android_ripple={{ color: tema.colors.primary.soft }}
                style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}
              >
                <Cartao
                  elevacao="sm"
                  style={{
                    minHeight: tema.sizes.touchTarget,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: tema.colors.primary.soft,
                  }}
                >
                  <Text style={[tema.typography.label, { color: tema.colors.primary.onSoft }]}>
                    Novas publicações · Toque para ver
                  </Text>
                </Cartao>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo="Nenhuma publicação ainda"
            descricao="Seja a primeira pessoa a publicar algo no feed do ACESSO."
          />
        }
        renderItem={({ item }) => (
          // `onPress` e `onCurtir` passados direto (não `() => abrirDetalhe(item.id)`), pelo mesmo
          // motivo de `onAbrirPerfil`: uma closure nova por item a cada render invalidaria o
          // `React.memo` de `ItemPostagem`, mesmo com os handlers já estáveis acima. O próprio item
          // chama `onPress(postagem.id)` e `onCurtir(postagem.id)`.
          <ItemPostagem postagem={item} tema={tema} onPress={abrirDetalhe} onCurtir={curtirNaLista} onAbrirPerfil={abrirPerfil} />
        )}
        ListFooterComponent={
          <View style={{ gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
            {buscandoProximaPagina === "proximaPagina" ? (
              <ActivityIndicator color={tema.colors.primary.solid} />
            ) : null}
            {/* Erro de uma página seguinte: a lista continua visível e o erro aparece junto,
                como em `VagasScreen`. */}
            {erro && postagens.length > 0 ? (
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
                Você chegou ao fim do feed.
              </Text>
            ) : null}
          </View>
        }
      />
    </ContainerTela>
  );
}

/**
 * Cartão de uma publicação, com `memo`: curtir troca só o objeto daquela publicação em `postagens`,
 * e com os handlers estáveis só a linha alterada renderiza de novo; as demais mantêm todas as props
 * iguais.
 */
const ItemPostagem = memo(function ItemPostagem({
  postagem,
  tema,
  onPress,
  onCurtir,
  onAbrirPerfil,
}: {
  postagem: Postagem;
  tema: Tema;
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

  const tempo = formatarTempoRelativo(postagem.criadoEm);

  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(postagem.id)}
        accessibilityRole="button"
        accessibilityLabel={`Publicação de ${nomeAutor}${tempo ? `, ${tempo}` : ""}`}
        android_ripple={{ color: tema.colors.divider }}
      >
        <Cartao elevacao="sm" style={{ gap: tema.spacing.sm, padding: tema.spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
            {/* Nested Pressable dentro do card inteiro (mesma técnica já usada
                pelo botão de curtir): tocar no autor abre o perfil dele, sem
                abrir o detalhe da publicação; o sistema de resposta do RN já
                garante que só o Pressable mais interno recebe o toque. */}
            <Pressable
              onPress={() => autor?.id && onAbrirPerfil(autor.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${nomeAutor}`}
              disabled={!autor?.id}
              style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm, flex: 1, minWidth: 0 }}
              // Avatar de 40dp: 4 de cada lado leva a área de toque a 48dp.
              hitSlop={4}
            >
              <Avatar nome={autor?.nome} fotoUrl={autor?.fotoPerfil} size="medium" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]} numberOfLines={1}>
                  {nomeAutor}
                </Text>
                {tempo ? (
                  <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{tempo}</Text>
                ) : null}
              </View>
            </Pressable>
          </View>

          {postagem.conteudo ? (
            <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={6}>
              {postagem.conteudo}
            </Text>
          ) : null}

          <AnexoResumo postagem={postagem} tema={tema} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "stretch",
              gap: tema.spacing.sm,
              marginTop: tema.spacing.xs,
              paddingTop: tema.spacing.sm,
              borderTopWidth: 1,
              borderTopColor: tema.colors.divider,
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
                minHeight: tema.sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: tema.spacing.xs,
                borderRadius: tema.radius.md,
                backgroundColor: postagem.curtidoPorMim ? tema.colors.primary.soft : pressed ? tema.colors.divider : "transparent",
              })}
            >
              {/* Sobre o fundo `soft` do botão, o ícone usa `onSoft`, como o texto "Curtido":
                  `solid` sobre `soft` mede 2,66:1 no tema claro, abaixo dos 3:1 do WCAG 1.4.11. */}
              <Ionicons
                name={postagem.curtidoPorMim ? "heart" : "heart-outline"}
                size={tema.sizes.iconMedium}
                color={postagem.curtidoPorMim ? tema.colors.primary.onSoft : tema.colors.textSecondary}
              />
              <Text
                style={[
                  tema.typography.bodySmall,
                  {
                    fontWeight: postagem.curtidoPorMim ? "700" : "400",
                    color: postagem.curtidoPorMim ? tema.colors.primary.onSoft : tema.colors.textSecondary,
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
                minHeight: tema.sizes.touchTarget,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: tema.spacing.xs,
                borderRadius: tema.radius.md,
                backgroundColor: pressed ? tema.colors.divider : "transparent",
              })}
            >
              <Ionicons name="chatbubble-outline" size={tema.sizes.iconMedium} color={tema.colors.textSecondary} />
              <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
                {postagem.totalComentarios > 0
                  ? `${postagem.totalComentarios} coment${postagem.totalComentarios === 1 ? "ário" : "ários"}`
                  : "Comentar"}
              </Text>
            </Pressable>
          </View>
        </Cartao>
      </Pressable>
    </View>
  );
});

/**
 * Resumo dos anexos no cartão: só o primeiro anexo; o conjunto completo, com descrição e tela
 * cheia, fica no `DetalhePostagemScreen`. O `accessibilityLabel` usa a descrição do anexo e, quando
 * o autor não escreveu nenhuma, avisa que há uma imagem sem descrição.
 */
function AnexoResumo({ postagem, tema }: { postagem: Postagem; tema: Tema }) {
  const anexos = postagem.anexos ?? [];
  if (anexos.length === 0) return null;

  const primeiro = anexos[0];
  if (!primeiro) return null;

  if (primeiro.tipo !== "imagem") {
    const rotulo = primeiro.tipo === "video" ? "Vídeo anexado" : "Arquivo anexado";
    return (
      <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
        {anexos.length > 1 ? `${rotulo} · +${anexos.length - 1}` : rotulo}
      </Text>
    );
  }

  return (
    <View>
      <Image
        // `expo-image` com `cacheKey` pelo `id` do anexo: a URL assinada muda a cada busca, e um
        // cache pela URL baixaria o mesmo arquivo de novo a cada recarga.
        source={{ uri: primeiro.url, cacheKey: primeiro.id }}
        accessible
        accessibilityLabel={primeiro.descricao || "Imagem anexada à publicação, sem descrição informada."}
        style={{ width: "100%", height: 180, borderRadius: tema.radius.md, backgroundColor: tema.colors.divider }}
        contentFit="cover"
      />
      {anexos.length > 1 ? (
        <Text style={[tema.typography.caption, { color: tema.colors.textMuted, marginTop: tema.spacing.xs }]}>
          +{anexos.length - 1} {anexos.length - 1 === 1 ? "anexo" : "anexos"}
        </Text>
      ) : null}
    </View>
  );
}
