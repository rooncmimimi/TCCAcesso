import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BuscaService } from "../busca";
import type { TipoBusca } from "../busca";
import type { ResultadoBusca } from "../components/BuscaResultadoItem";
import { BuscaResultadoItem } from "../components/BuscaResultadoItem";
import { Botao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";

const LIMITE_POR_PAGINA = 10;

type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry" | "atualizar";

type SearchResultsScreenProps = NativeStackScreenProps<AppStackParamList, "SearchResults">;

/** Exportado para o `AppNavigator.tsx` usar o mesmo rótulo no título do header. */
export const TITULO_TIPO_BUSCA: Record<TipoBusca, string> = {
  usuarios: "Pessoas",
  empresas: "Empresas",
  vagas: "Vagas",
  postagens: "Publicações",
};

/**
 * Resultados completos de uma categoria da busca, com paginação por página (o resumo da
 * `BuscaScreen` só traz até 5 itens). É uma tela genérica, parametrizada por `tipo`, como
 * `ListaSeguidoresScreen.tsx`; cada item é desenhado por `BuscaResultadoItem`, compartilhado com a
 * `BuscaScreen`.
 */
export function ResultadosBuscaScreen({ route, navigation }: SearchResultsScreenProps) {
  const { tema } = useTema();
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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar os resultados."));
      } finally {
        setBuscando(null);
        setPrimeiroCarregamentoConcluido(true);
      }
    },
    [buscarPagina],
  );

  // Função inline dentro do próprio efeito (mesmo padrão de `VagasScreen.tsx`): evita o lint `react-hooks/set-state-in-effect`.
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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar os resultados."));
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
    return <EstadoCarregamento />;
  }

  if (erro && itens.length === 0) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar os resultados"
        mensagem={erro}
        onTentarNovamente={() => void buscar(1, "retry")}
        tentandoNovamente={buscando === "retry"}
      />
    );
  }

  return (
    <ContainerTela>
      <FlatList
        testID="busca-resultados-lista"
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, gap: tema.spacing.sm, paddingVertical: tema.spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar")}
            colors={[tema.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          total > 0 ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[tema.typography.bodySmall, { color: tema.colors.textMuted, marginBottom: tema.spacing.sm }]}
            >
              {`${total} resultado${total === 1 ? "" : "s"}${totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo="Nenhum resultado"
            descricao={`Nenhum resultado em "${TITULO_TIPO_BUSCA[tipo].toLowerCase()}" para "${termo}".`}
          />
        }
        renderItem={({ item }) => (
          <BuscaResultadoItem
            tipo={tipo}
            item={item}
            tema={tema}
            onAbrirUsuario={abrirUsuario}
            onAbrirVaga={abrirVaga}
            onAbrirPostagem={abrirPostagem}
          />
        )}
        ListFooterComponent={
          <View style={{ gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
            {totalPaginas > 1 ? (
              <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void buscar(pagina - 1, "anterior")}
                  carregando={buscando === "anterior"}
                  disabled={buscando !== null || pagina <= 1}
                >
                  Página anterior
                </Botao>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void buscar(pagina + 1, "proxima")}
                  carregando={buscando === "proxima"}
                  disabled={buscando !== null || pagina >= totalPaginas}
                >
                  Próxima página
                </Botao>
              </View>
            ) : null}
            {erro && itens.length > 0 ? (
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
                  onPress={() => void buscar(pagina, "retry")}
                  carregando={buscando === "retry"}
                  disabled={buscando !== null}
                >
                  Tentar novamente
                </Botao>
              </View>
            ) : null}
          </View>
        }
      />
    </ContainerTela>
  );
}
