import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button, Card, ScreenContainer } from "../components/ui";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { SeguidorService } from "../seguidores";
import type { UsuarioResumoSocial } from "../seguidores";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_POR_PAGINA = 20;

type FollowListScreenProps = NativeStackScreenProps<AppStackParamList, "FollowList">;

/** Mesmo cálculo de `PublicProfileScreen.tsx` — duplicado de propósito. */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

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
  const [buscando, setBuscando] = useState<"inicial" | "anterior" | "proxima" | "retry" | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscar = useCallback(
    async (paginaAlvo: number, acao: "anterior" | "proxima" | "retry") => {
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

  function abrirPerfil(alvoId: string) {
    navigation.push("PublicProfile", { usuarioId: alvoId });
  }

  if (!primeiroCarregamentoConcluido) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && itens.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              {modo === "seguidores" ? "Não foi possível carregar os seguidores" : "Não foi possível carregar quem esta pessoa segue"}
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
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
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
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              {modo === "seguidores" ? "Ninguém segue este perfil ainda." : "Este perfil ainda não segue ninguém."}
            </Text>
          </Card>
        }
        renderItem={({ item }) => <ItemUsuario item={item} theme={theme} onPress={() => abrirPerfil(item.id)} />}
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

function ItemUsuario({ item, theme, onPress }: { item: UsuarioResumoSocial; theme: Theme; onPress: () => void }) {
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir perfil de ${item.nome}`}
        android_ripple={{ color: theme.colors.divider }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
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
            <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>{iniciaisDoNome(item.nome)}</Text>
          </View>
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.nome}
          </Text>
        </Card>
      </Pressable>
    </View>
  );
}
