import { memo, useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, ScreenContainer } from "../components/ui";
import { ModeracaoService } from "../moderacao";
import type { UsuarioBloqueado } from "../moderacao";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_POR_PAGINA = 20;

/**
 * Usuários bloqueados (Fase 19) — paginação clássica (mesmo padrão de
 * `FollowListScreen.tsx`): lista que fecha, não cresce sem fim. Sem toque
 * pra abrir o perfil de quem está bloqueado — a ação relevante aqui é só
 * desbloquear, não navegar de volta pra dentro do perfil de alguém que o
 * próprio usuário escolheu bloquear.
 */
export function BlockedUsersScreen() {
  const { theme } = useTheme();

  const [itens, setItens] = useState<UsuarioBloqueado[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<"inicial" | "anterior" | "proxima" | "retry" | "atualizar" | null>(
    "inicial",
  );
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscar = useCallback(async (paginaAlvo: number, acao: "anterior" | "proxima" | "retry" | "atualizar") => {
    setBuscando(acao);
    setErro(null);
    try {
      const resposta = await ModeracaoService.listarBloqueados({ page: paginaAlvo, limit: LIMITE_POR_PAGINA });
      setItens(resposta.bloqueados);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar a lista agora."));
    } finally {
      setBuscando(null);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await ModeracaoService.listarBloqueados({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setItens(resposta.bloqueados);
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
  }, []);

  // Fase 25 (performance) — `useCallback` + `React.memo` no `ItemBloqueado`
  // (renderizado via `.map()`, mas o mesmo raciocínio se aplica: cada
  // paginação/refresh recria o array). `setItens`/`setTotal` são estáveis.
  // Ver `HomeScreen.tsx`.
  const removerDaLista = useCallback((usuarioId: string) => {
    setItens((atual) => atual.filter((item) => item.id !== usuarioId));
    setTotal((atual) => Math.max(0, atual - 1));
  }, []);

  if (!primeiroCarregamentoConcluido) {
    return <LoadingState />;
  }

  if (erro && itens.length === 0) {
    return (
      <ErrorState
        title="Não foi possível carregar seus bloqueios"
        message={erro}
        onRetry={() => void buscar(1, "retry")}
        retrying={buscando === "retry"}
      />
    );
  }

  return (
    <ScreenContainer>
      {/* Fase 26 (polish): era um `View` fixo sem `ScrollView` nenhum por
          baixo — com mais de ~8 bloqueios (o limite é 20 por página), o
          conteúdo passava da altura da tela e os botões de paginação no
          fim ficavam inalcançáveis. `ScreenContainer` não rola sozinho (é
          só `SafeAreaView` + `View`, ver o próprio componente). */}
      <ScrollView
        testID="bloqueados-scroll"
        contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar")}
            colors={[theme.colors.primary.solid]}
          />
        }
      >
        {total > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}
          >
            {`${total} usuário${total === 1 ? "" : "s"} bloqueado${total === 1 ? "" : "s"}`}
          </Text>
        ) : null}

        {itens.length === 0 ? (
          <EmptyState description="Você não bloqueou ninguém ainda." />
        ) : (
          itens.map((item) => (
            // `onDesbloqueado` passado DIRETO — o item chama `onDesbloqueado(item.id)`. Ver `HomeScreen.tsx`.
            <ItemBloqueado key={item.id} item={item} theme={theme} onDesbloqueado={removerDaLista} />
          ))
        )}

        {totalPaginas > 1 ? (
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
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Função local, não exportada — só `BlockedUsersScreen` consome.
 *
 * `React.memo` (Fase 25, performance) — mesma razão de `PostagemListItem` em
 * `HomeScreen.tsx`: com `onDesbloqueado` estável e recebendo o `id` como
 * parâmetro, desbloquear UM usuário não reprocessa as outras linhas.
 */
const ItemBloqueado = memo(function ItemBloqueado({
  item,
  theme,
  onDesbloqueado,
}: {
  item: UsuarioBloqueado;
  theme: Theme;
  onDesbloqueado: (usuarioId: string) => void;
}) {
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function desbloquear() {
    if (desbloqueando) return;
    setDesbloqueando(true);
    setErro(null);
    try {
      await ModeracaoService.desbloquear(item.id);
      onDesbloqueado(item.id);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível desbloquear agora."));
      setDesbloqueando(false);
    }
  }

  return (
    <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
      <Avatar nome={item.nome} fotoUrl={item.fotoPerfil} size="medium" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {item.nome}
        </Text>
        {erro ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[theme.typography.caption, { color: theme.colors.error.solid }]}>
            {erro}
          </Text>
        ) : null}
      </View>
      <Button variant="outline" size="small" onPress={() => void desbloquear()} loading={desbloqueando} disabled={desbloqueando}>
        Desbloquear
      </Button>
    </Card>
  );
});
