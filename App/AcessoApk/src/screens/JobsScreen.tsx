import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Badge, Button, Card, ScreenContainer } from "../components/ui";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { MODALIDADE_LABEL, PUBLICO_ALVO_LABEL, VagasService } from "../vagas";
import type { Vaga } from "../vagas";

const LIMITE_POR_PAGINA = 10;

/** Qual ação está em voo agora — `null` quando nada está carregando. Serve
 * pra duas coisas ao mesmo tempo: desabilitar TODOS os controles enquanto
 * qualquer busca está em andamento (evita chamadas concorrentes/duplo
 * toque, Fase 9 item 3) e mostrar o spinner só no botão que o usuário
 * realmente tocou (feedback visual por ação, não um spinner genérico). */
type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry";

/**
 * `Jobs` (a aba) precisa navegar para `VagaDetail`, que mora no Stack PAI
 * (`AppStackParamList`), não dentro da própria tab — por isso o tipo de
 * navegação é composto (`CompositeScreenProps`), não só
 * `BottomTabScreenProps`. Padrão oficial do React Navigation v7 pra esse
 * cenário (tela de uma tab que precisa empilhar uma tela do Stack pai).
 */
type JobsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "Jobs">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Primeiro módulo de conteúdo real do App (Fase 9) — substitui o placeholder
 * das fases anteriores. Lista vagas abertas com paginação clássica (a API já
 * entrega `pagina`/`totalPaginas`/`total` prontos pra isso — sem
 * infinite-scroll, sem filtros nesta fase). Candidatar-se e favoritar vivem
 * só em `VagaDetailScreen`, não aqui: mostrar favoritar em cada item da
 * lista multiplicaria o problema já documentado de "estado inicial
 * desconhecido" (a API não informa se a vaga já está favoritada) por N
 * itens ao mesmo tempo — um único botão no detalhe é mais honesto.
 */
export function JobsScreen({ navigation }: JobsScreenProps) {
  const { theme } = useTheme();

  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<AcaoBusca | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  /** Usada pelos botões (retry/anterior/próxima) — nunca chamada por um
   * efeito, por isso pode fazer `setState` síncrono no início sem problema
   * nenhum (é exatamente o que dá o feedback visual imediato do item 3). */
  const buscar = useCallback(async (paginaAlvo: number, acao: AcaoBusca) => {
    setBuscando(acao);
    setErro(null);
    try {
      const resposta = await VagasService.listar({ page: paginaAlvo, limit: LIMITE_POR_PAGINA });
      setVagas(resposta.vagas);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      // Fase 9, item 8: uma falha ao trocar de página NUNCA apaga a lista
      // atual — `vagas`/`pagina`/`totalPaginas` só são sobrescritos no bloco
      // de sucesso acima. O erro aparece perto do paginador (ou em tela
      // cheia, se ainda não havia nenhuma vaga carregada).
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar as vagas."));
    } finally {
      setBuscando(null);
      setPrimeiroCarregamentoConcluido(true);
    }
  }, []);

  // Busca da MONTAGEM: função declarada dentro do próprio efeito (mesmo
  // padrão de `AuthProvider.tsx`), não uma chamada a `buscar` de fora —
  // chamar uma função externa que faz `setState` a partir de um efeito
  // aciona o lint `react-hooks/set-state-in-effect` (cascata de renders);
  // com a função inline, o linter consegue ver que todo `setState` roda
  // depois do primeiro `await`, então não acusa nada. `buscando`/`erro` já
  // nascem corretos (`"inicial"`/`null`) pelo valor padrão do `useState`,
  // então não precisam ser reatribuídos aqui antes do `await`.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await VagasService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setVagas(resposta.vagas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar as vagas."));
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

  function abrirDetalhe(vagaId: string) {
    navigation.navigate("VagaDetail", { vagaId });
  }

  // Fase 9, item 9: primeiro carregamento é tela cheia de loading, sem lista
  // nenhuma por baixo — só acontece uma vez, antes de `primeiroCarregamentoConcluido`.
  if (!primeiroCarregamentoConcluido) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  // Erro logo no primeiro carregamento (nunca chegou a ter nenhuma vaga) —
  // tela cheia de erro, diferente do erro de uma troca de página (abaixo).
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
              Não foi possível carregar as vagas
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
      <FlatList
        data={vagas}
        keyExtractor={(vaga) => vaga.id}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        ListHeaderComponent={
          total > 0 ? (
            <Text
              // Fase 8: contador é texto MUDANDO num nó que persiste entre
              // trocas de página (o próprio cabeçalho do FlatList) — o caso
              // de uso que a política já definida chama de liveRegion, não
              // announceForAccessibility.
              accessibilityLiveRegion="polite"
              style={[theme.typography.bodySmall, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}
            >
              {`${total} vaga${total === 1 ? "" : "s"} encontrada${total === 1 ? "" : "s"}${
                totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""
              }`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Nenhuma vaga encontrada</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Ainda não há vagas abertas no momento. Volte mais tarde.
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <VagaListItem vaga={item} theme={theme} onPress={() => abrirDetalhe(item.id)} />
        )}
        ListFooterComponent={
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {totalPaginas > 1 ? (
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
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
            {/* Erro de uma troca de página — a lista acima continua visível, só isto aparece junto. */}
            {erro && vagas.length > 0 ? (
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
                  onPress={() => void buscar(pagina, "retry")}
                  loading={buscando === "retry"}
                  disabled={buscando !== null}
                >
                  Tentar novamente
                </Button>
              </View>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

/**
 * Função local, não exportada — só `JobsScreen` consome. `src/vagas/` fica
 * flat (igual `src/auth/`), sem subpasta `components/`, então este card não
 * vira um arquivo próprio por ter um único consumidor (mesmo raciocínio de
 * `PlaceholderScreen`, que só virou compartilhado por servir 8 telas ao
 * mesmo tempo).
 */
function VagaListItem({ vaga, theme, onPress }: { vaga: Vaga; theme: Theme; onPress: () => void }) {
  const empresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa não informada";
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const modalidade = MODALIDADE_LABEL[vaga.modalidade] ?? vaga.modalidade;
  const publicoAlvoLabel =
    vaga.publicoAlvo && vaga.publicoAlvo !== "geral" ? PUBLICO_ALVO_LABEL[vaga.publicoAlvo] : null;

  // Fase 9, item 17: o item inteiro precisa ser UMA unidade compreensível
  // pro leitor de tela, não uma pilha de `Text` separados — por isso o
  // `Pressable` externo recebe `accessibilityRole`/`accessibilityLabel`
  // próprios (o RN já une os filhos visuais num nó só quando o pai é
  // acessível com role definida) em vez de confiar só na leitura visual.
  const rotulo = [vaga.titulo, empresa, local || null, modalidade, publicoAlvoLabel].filter(Boolean).join(", ");

  return (
    // `overflow:"hidden"` + `borderRadius` no wrapper (não no Pressable) é o
    // que faz o `android_ripple` respeitar os cantos arredondados do Card
    // por baixo — sem isso o ripple "vaza" quadrado por cima do card redondo.
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {vaga.titulo}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {empresa}
          </Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {local ? `${local} · ${modalidade}` : modalidade}
          </Text>
          {publicoAlvoLabel ? <Badge variant="info">{publicoAlvoLabel}</Badge> : null}
        </Card>
      </Pressable>
    </View>
  );
}
