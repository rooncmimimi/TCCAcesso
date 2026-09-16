import { memo, useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, ScreenContainer } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { SeguidorService } from "../seguidores";
import type { UsuarioResumoSocial } from "../seguidores";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_POR_PAGINA = 20;

type FollowListScreenProps = NativeStackScreenProps<AppStackParamList, "FollowList">;

/**
 * Lista de seguidores/seguindo de um usuário (Fase 14) — paginação clássica
 * (mesmo padrão de `JobsScreen.tsx`, não scroll infinito como o Feed): é
 * uma lista que fecha (nem seguidores de um perfil novo chegam a milhares),
 * não uma que só cresce indefinidamente.
 */
export function FollowListScreen({ route, navigation }: FollowListScreenProps) {
  const { theme } = useTheme();
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
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar a lista agora."));
      } finally {
        setBuscando(null);
      }
    },
    [modo, usuarioId],
  );

  // Função inline dentro do próprio efeito (mesmo padrão de `JobsScreen.tsx`) — evita o lint `react-hooks/set-state-in-effect`.
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
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar a lista agora."));
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

  // Fase 25 (performance) — `useCallback` + `React.memo` no `ItemUsuario`.
  // `[navigation]` é estável durante a vida da tela. Ver `HomeScreen.tsx`.
  const abrirPerfil = useCallback(
    (alvoId: string) => {
      navigation.push("PublicProfile", { usuarioId: alvoId });
    },
    [navigation],
  );

  if (!primeiroCarregamentoConcluido) {
    return <LoadingState />;
  }

  if (erro && itens.length === 0) {
    return (
      <ErrorState
        title={
          modo === "seguidores" ? "Não foi possível carregar os seguidores" : "Não foi possível carregar quem esta pessoa segue"
        }
        message={erro}
        onRetry={() => void buscar(1, "retry")}
        retrying={buscando === "retry"}
      />
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        testID="follow-lista"
        data={itens}
        keyExtractor={(item) => item.id}
        // Fase 25 (performance) — ver o mesmo ajuste, com a razão completa, em `HomeScreen.tsx`.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        // Fase 26 (polish) — mesma razão de `JobsScreen.tsx`: refaz a MESMA página aberta.
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
              {`${total} ${modo === "seguidores" ? "seguidor" : "perfil"}${total === 1 ? "" : modo === "seguidores" ? "es" : "is"}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            description={modo === "seguidores" ? "Ninguém segue este perfil ainda." : "Este perfil ainda não segue ninguém."}
          />
        }
        renderItem={({ item }) => <ItemUsuario item={item} theme={theme} onPress={abrirPerfil} />}
        ListFooterComponent={
          totalPaginas > 1 ? (
            <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
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
          ) : null
        }
      />
    </ScreenContainer>
  );
}

/**
 * `React.memo` (Fase 25, performance) — mesma razão de `PostagemListItem` em
 * `HomeScreen.tsx`: com o `onPress` estável e recebendo o `id` como
 * parâmetro, uma troca de página não reprocessa as linhas que não mudaram.
 */
const ItemUsuario = memo(function ItemUsuario({
  item,
  theme,
  onPress,
}: {
  item: UsuarioResumoSocial;
  theme: Theme;
  onPress: (usuarioId: string) => void;
}) {
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${item.nome}`}
        android_ripple={{ color: theme.colors.divider }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <Avatar nome={item.nome} fotoUrl={item.fotoPerfil} size="medium" />
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.nome}
          </Text>
        </Card>
      </Pressable>
    </View>
  );
});
