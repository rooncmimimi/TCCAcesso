import { memo, useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { Avatar, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import { ModeracaoService } from "../moderacao";
import type { UsuarioBloqueado } from "../moderacao";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const LIMITE_POR_PAGINA = 20;

/**
 * Usuários bloqueados, com paginação por página como em `ListaSeguidoresScreen.tsx`. Tocar num item
 * não abre o perfil: a única ação aqui é desbloquear, e não faz sentido levar a pessoa para dentro
 * do perfil de quem ela bloqueou.
 */
export function UsuariosBloqueadosScreen() {
  const { tema } = useTema();

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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar a lista agora."));
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
  }, []);

  // `useCallback` junto do `memo` de `ItemBloqueado`, renderizado por `.map()` e recriado a cada
  // página ou atualização. `setItens` e `setTotal` são estáveis (ver `FeedScreen.tsx`).
  const removerDaLista = useCallback((usuarioId: string) => {
    setItens((atual) => atual.filter((item) => item.id !== usuarioId));
    setTotal((atual) => Math.max(0, atual - 1));
  }, []);

  if (!primeiroCarregamentoConcluido) {
    return <EstadoCarregamento />;
  }

  if (erro && itens.length === 0) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar seus bloqueios"
        mensagem={erro}
        onTentarNovamente={() => void buscar(1, "retry")}
        tentandoNovamente={buscando === "retry"}
      />
    );
  }

  return (
    <ContainerTela>
      {/* `ScrollView` porque o `ContainerTela` não rola: com uma página cheia (até 20
          bloqueios), o conteúdo passaria da altura da tela e os botões de paginação ficariam
          inalcançáveis. */}
      <ScrollView
        testID="bloqueados-scroll"
        contentContainerStyle={{ gap: tema.spacing.sm, paddingVertical: tema.spacing.md, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar")}
            colors={[tema.colors.primary.solid]}
          />
        }
      >
        {total > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}
          >
            {`${total} usuário${total === 1 ? "" : "s"} bloqueado${total === 1 ? "" : "s"}`}
          </Text>
        ) : null}

        {itens.length === 0 ? (
          <EstadoVazio descricao="Você não bloqueou ninguém ainda." />
        ) : (
          itens.map((item) => (
            // `onDesbloqueado` passado direto: o item chama `onDesbloqueado(item.id)`. Ver `FeedScreen.tsx`.
            <ItemBloqueado key={item.id} item={item} tema={tema} onDesbloqueado={removerDaLista} />
          ))
        )}

        {totalPaginas > 1 ? (
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
        ) : null}
      </ScrollView>
    </ContainerTela>
  );
}

/**
 * Usuário bloqueado na lista, com `memo`: `onDesbloqueado` é estável e recebe o `id`, então
 * desbloquear um usuário não renderiza os outros de novo.
 */
const ItemBloqueado = memo(function ItemBloqueado({
  item,
  tema,
  onDesbloqueado,
}: {
  item: UsuarioBloqueado;
  tema: Tema;
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível desbloquear agora."));
      setDesbloqueando(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
      <Avatar nome={item.nome} fotoUrl={item.fotoPerfil} size="medium" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
          {item.nome}
        </Text>
        {erro ? (
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
            {erro}
          </Text>
        ) : null}
      </View>
      <Botao variant="outline" size="small" onPress={() => void desbloquear()} carregando={desbloqueando} disabled={desbloqueando}>
        Desbloquear
      </Botao>
    </Cartao>
  );
});
