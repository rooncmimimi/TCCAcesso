import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button, Card, ScreenContainer } from "../components/ui";
import { ModeracaoService } from "../moderacao";
import type { UsuarioBloqueado } from "../moderacao";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_POR_PAGINA = 20;

/** Mesmo cálculo de outras telas — duplicado de propósito. */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

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
  const [buscando, setBuscando] = useState<"inicial" | "anterior" | "proxima" | "retry" | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscar = useCallback(async (paginaAlvo: number, acao: "anterior" | "proxima" | "retry") => {
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

  function removerDaLista(usuarioId: string) {
    setItens((atual) => atual.filter((item) => item.id !== usuarioId));
    setTotal((atual) => Math.max(0, atual - 1));
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
              Não foi possível carregar seus bloqueios
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
      <View style={{ flex: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}>
        {total > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}
          >
            {`${total} usuário${total === 1 ? "" : "s"} bloqueado${total === 1 ? "" : "s"}`}
          </Text>
        ) : null}

        {itens.length === 0 ? (
          <Card elevation="md" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              Você não bloqueou ninguém ainda.
            </Text>
          </Card>
        ) : (
          itens.map((item) => (
            <ItemBloqueado key={item.id} item={item} theme={theme} onDesbloqueado={() => removerDaLista(item.id)} />
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
      </View>
    </ScreenContainer>
  );
}

/** Função local, não exportada — só `BlockedUsersScreen` consome. */
function ItemBloqueado({ item, theme, onDesbloqueado }: { item: UsuarioBloqueado; theme: Theme; onDesbloqueado: () => void }) {
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function desbloquear() {
    if (desbloqueando) return;
    setDesbloqueando(true);
    setErro(null);
    try {
      await ModeracaoService.desbloquear(item.id);
      onDesbloqueado();
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível desbloquear agora."));
      setDesbloqueando(false);
    }
  }

  return (
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
}
