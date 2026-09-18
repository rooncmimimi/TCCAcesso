import { memo, useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { SeguidorService } from "../seguidores";
import type { UsuarioResumoSocial } from "../seguidores";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const LIMITE_POR_PAGINA = 20;

type FollowListScreenProps = NativeStackScreenProps<AppStackParamList, "FollowList">;

/**
 * Seguidores ou seguidos de um usuário, com paginação por página como em `VagasScreen.tsx`: é uma
 * lista que fecha, e não um feed que cresce sem fim.
 */
export function ListaSeguidoresScreen({ route, navigation }: FollowListScreenProps) {
  const { tema } = useTema();
  const { usuarioId, modo } = route.params;

  const [itens, setItens] = useState<UsuarioResumoSocial[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<"inicial" | "anterior" | "proxima" | "retry" | "atualizar" | null>(
    "inicial",
  );
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscar = useCallback(
    async (paginaAlvo: number, acao: "anterior" | "proxima" | "retry" | "atualizar") => {
      setBuscando(acao);
      setErro(null);
      try {
        const resposta =
          modo === "seguidores"
            ? await SeguidorService.listarSeguidores(usuarioId, { page: paginaAlvo, limit: LIMITE_POR_PAGINA })
            : await SeguidorService.listarSeguindo(usuarioId, { page: paginaAlvo, limit: LIMITE_POR_PAGINA });
        const lista = "seguidores" in resposta ? resposta.seguidores : resposta.seguindo;
        setItens(lista);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar a lista agora."));
      } finally {
        setBuscando(null);
      }
    },
    [modo, usuarioId],
  );

  // Função inline dentro do próprio efeito (mesmo padrão de `VagasScreen.tsx`): evita o lint `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta =
          modo === "seguidores"
            ? await SeguidorService.listarSeguidores(usuarioId, { page: 1, limit: LIMITE_POR_PAGINA })
            : await SeguidorService.listarSeguindo(usuarioId, { page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        const lista = "seguidores" in resposta ? resposta.seguidores : resposta.seguindo;
        setItens(lista);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar a lista agora."));
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
  }, [usuarioId, modo]);

  // `useCallback` junto do `memo` de `ItemUsuario`; `navigation` é estável durante a vida da tela
  // (ver `FeedScreen.tsx`).
  const abrirPerfil = useCallback(
    (alvoId: string) => {
      navigation.push("PublicProfile", { usuarioId: alvoId });
    },
    [navigation],
  );

  if (!primeiroCarregamentoConcluido) {
    return <EstadoCarregamento />;
  }

  if (erro && itens.length === 0) {
    return (
      <EstadoErro
        titulo={
          modo === "seguidores" ? "Não foi possível carregar os seguidores" : "Não foi possível carregar quem esta pessoa segue"
        }
        mensagem={erro}
        onTentarNovamente={() => void buscar(1, "retry")}
        tentandoNovamente={buscando === "retry"}
      />
    );
  }

  return (
    <ContainerTela>
      <FlatList
        testID="follow-lista"
        data={itens}
        keyExtractor={(item) => item.id}
        // Mesmo ajuste do `FeedScreen.tsx`, onde está o motivo.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: tema.spacing.sm, paddingVertical: tema.spacing.md }}
        // Como em `VagasScreen.tsx`, puxar para atualizar refaz a mesma página aberta.
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
              {`${total} ${modo === "seguidores" ? "seguidor" : "perfil"}${total === 1 ? "" : modo === "seguidores" ? "es" : "is"}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EstadoVazio
            descricao={modo === "seguidores" ? "Ninguém segue este perfil ainda." : "Este perfil ainda não segue ninguém."}
          />
        }
        renderItem={({ item }) => <ItemUsuario item={item} tema={tema} onPress={abrirPerfil} />}
        ListFooterComponent={
          totalPaginas > 1 ? (
            <View style={{ flexDirection: "row", gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
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
          ) : null
        }
      />
    </ContainerTela>
  );
}

/**
 * Com `memo` e o `onPress` estável recebendo o `id`, trocar de página não renderiza de novo as
 * linhas que não mudaram.
 */
const ItemUsuario = memo(function ItemUsuario({
  item,
  tema,
  onPress,
}: {
  item: UsuarioResumoSocial;
  tema: Tema;
  onPress: (usuarioId: string) => void;
}) {
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${item.nome}`}
        android_ripple={{ color: tema.colors.divider }}
      >
        <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
          <Avatar nome={item.nome} fotoUrl={item.fotoPerfil} size="medium" />
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
            {item.nome}
          </Text>
        </Cartao>
      </Pressable>
    </View>
  );
});
