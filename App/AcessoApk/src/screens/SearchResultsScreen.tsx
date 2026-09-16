import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BuscaService } from "../busca";
import type { TipoBusca } from "../busca";
import type { ResultadoBusca } from "../components/BuscaResultadoItem";
import { BuscaResultadoItem } from "../components/BuscaResultadoItem";
import { Button, EmptyState, ErrorState, LoadingState, ScreenContainer } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";

const LIMITE_POR_PAGINA = 10;

type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry" | "atualizar";

type SearchResultsScreenProps = NativeStackScreenProps<AppStackParamList, "SearchResults">;

/** Exportado para `AppNavigator.tsx` usar o MESMO rótulo no título do header (Fase R2) — uma fonte só. */
export const TITULO_TIPO_BUSCA: Record<TipoBusca, string> = {
  usuarios: "Pessoas",
  empresas: "Empresas",
  vagas: "Vagas",
  postagens: "Publicações",
};

/**
 * "Ver mais" de UMA categoria da busca global (Fase R2, recomendada) —
 * paginação clássica de verdade (diferente do resumo agrupado de
 * `SearchScreen`, que só traz até 5 itens sem paginar). Mesmo padrão de
 * `FollowListScreen.tsx`: uma tela genérica, parametrizada por `tipo`, não
 * 4 telas quase idênticas. A renderização de cada item (por categoria) mora
 * em `BuscaResultadoItem` — compartilhada de verdade com `SearchScreen`.
 */
export function SearchResultsScreen({ route, navigation }: SearchResultsScreenProps) {
  const { theme } = useTheme();
  const { termo, tipo } = route.params;

  const [itens, setItens] = useState<ResultadoBusca[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<AcaoBusca | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscarPagina = useCallback(
    (paginaAlvo: number) => {
      const parametros = { page: paginaAlvo, limit: LIMITE_POR_PAGINA };
      switch (tipo) {
        case "usuarios":
          return BuscaService.buscarUsuarios(termo, parametros).then((resposta) => ({ ...resposta, itens: resposta.resultados.usuarios }));
        case "empresas":
          return BuscaService.buscarEmpresas(termo, parametros).then((resposta) => ({ ...resposta, itens: resposta.resultados.empresas }));
        case "vagas":
          return BuscaService.buscarVagas(termo, parametros).then((resposta) => ({ ...resposta, itens: resposta.resultados.vagas }));
        case "postagens":
          return BuscaService.buscarPostagens(termo, parametros).then((resposta) => ({ ...resposta, itens: resposta.resultados.postagens }));
      }
    },
    [termo, tipo],
  );

  const buscar = useCallback(
    async (paginaAlvo: number, acao: AcaoBusca) => {
      setBuscando(acao);
      setErro(null);
      try {
        const resposta = await buscarPagina(paginaAlvo);
        setItens(resposta.itens);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar os resultados."));
      } finally {
        setBuscando(null);
        setPrimeiroCarregamentoConcluido(true);
      }
    },
    [buscarPagina],
  );

  // Função inline dentro do próprio efeito (mesmo padrão de `JobsScreen.tsx`) — evita o lint `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await buscarPagina(1);
        if (cancelado) return;
        setItens(resposta.itens);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar os resultados."));
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
  }, [buscarPagina]);

  function abrirUsuario(usuarioId: string) {
    navigation.navigate("PublicProfile", { usuarioId });
  }

  function abrirVaga(vagaId: string) {
    navigation.navigate("VagaDetail", { vagaId });
  }

  function abrirPostagem(postagemId: string) {
    navigation.navigate("PostagemDetail", { postagemId });
  }

  if (!primeiroCarregamentoConcluido) {
    return <LoadingState />;
  }

  if (erro && itens.length === 0) {
    return (
      <ErrorState
        title="Não foi possível carregar os resultados"
        message={erro}
        onRetry={() => void buscar(1, "retry")}
        retrying={buscando === "retry"}
      />
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        testID="busca-resultados-lista"
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar")}
            colors={[theme.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          total > 0 ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[theme.typography.bodySmall, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}
            >
              {`${total} resultado${total === 1 ? "" : "s"}${totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Nenhum resultado"
            description={`Nenhum resultado em "${TITULO_TIPO_BUSCA[tipo].toLowerCase()}" para "${termo}".`}
          />
        }
        renderItem={({ item }) => (
          <BuscaResultadoItem
            tipo={tipo}
            item={item}
            theme={theme}
            onAbrirUsuario={abrirUsuario}
            onAbrirVaga={abrirVaga}
            onAbrirPostagem={abrirPostagem}
          />
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
            {erro && itens.length > 0 ? (
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
