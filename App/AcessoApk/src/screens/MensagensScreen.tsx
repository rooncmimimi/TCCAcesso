import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAutenticacao } from "../autenticacao";
import { Avatar, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela, CabecalhoTela } from "../components/ui";
import { ConversaService } from "../mensagens";
import type { Conversa, ParticipanteConversa } from "../mensagens";
import type { AppStackParamList, AbasParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const LIMITE_POR_PAGINA = 20;

type AcaoBusca = "proximaPagina" | "retry" | null;

type MessagesScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AbasParamList, "Messages">,
  NativeStackScreenProps<AppStackParamList>
>;

function nomeExibicao(participante: ParticipanteConversa | null): string {
  if (!participante) return "Usuário removido";
  return participante.empresa?.nomeFantasia ?? participante.empresa?.razaoSocial ?? participante.nome;
}

/** Mesmo raciocínio de `nomeExibicao` acima: empresa mostra o logo, não a foto pessoal de quem administra a conta. */
function fotoExibicao(participante: ParticipanteConversa | null): string | null {
  if (!participante) return null;
  return participante.empresa?.logo ?? participante.fotoPerfil;
}

/** Quem é o outro participante, do ponto de vista de `meuId`: nunca presume qual campo (`usuarioA`/`usuarioB`) é "o outro". */
function outroParticipante(conversa: Conversa, meuId: string | undefined): ParticipanteConversa | null {
  if (conversa.usuarioAId === meuId) return conversa.usuarioB;
  return conversa.usuarioA;
}

function formatarHorarioOuData(valor: string | null): string {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data)
    : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(data);
}

/**
 * Lista de conversas, com a mesma paginação incremental do feed e das notificações e com puxar para
 * atualizar. Eventos de tempo real (`mensagem:nova` e `conversa:atualizada`) recarregam a primeira
 * página pela API, porque o evento nunca traz a conversa completa (ver `realtime/socket.js`).
 */
export function MensagensScreen({ navigation }: MessagesScreenProps) {
  const { tema } = useTema();
  const { usuario } = useAutenticacao();

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [buscandoProximaPagina, setBuscandoProximaPagina] = useState<AcaoBusca>(null);
  const buscaEmVooRef = useRef(false);

  function acumularPagina(atual: Conversa[], novas: Conversa[]): Conversa[] {
    const idsExistentes = new Set(atual.map((conversa) => conversa.id));
    return [...atual, ...novas.filter((conversa) => !idsExistentes.has(conversa.id))];
  }

  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await ConversaService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setConversas(resposta.conversas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas conversas."));
      } finally {
        if (!cancelado) setCarregandoInicial(false);
      }
    }

    void carregarInicial();
    return () => {
      cancelado = true;
    };
  }, []);

  const recarregarDoInicio = useCallback(async (comoAtualizacao: boolean) => {
    if (comoAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregandoInicial(true);
    }
    setErro(null);
    try {
      const resposta = await ConversaService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
      setConversas(resposta.conversas);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas conversas."));
    } finally {
      if (comoAtualizacao) {
        setAtualizando(false);
      } else {
        setCarregandoInicial(false);
      }
    }
  }, []);

  // Tempo real: uma mensagem nova em qualquer conversa (ou uma conversa
  // marcada como lida em outro dispositivo) pode mudar a ordem/contagem;
  // recarrega a primeira página de novo, nunca tenta reconciliar o payload
  // do evento manualmente (mesma razão documentada em `realtime/socket.js`).
  useEffect(() => {
    const limparNova = ouvirEvento("mensagem:nova", () => void recarregarDoInicio(false));
    const limparAtualizada = ouvirEvento("conversa:atualizada", () => void recarregarDoInicio(false));
    return () => {
      limparNova();
      limparAtualizada();
    };
  }, [recarregarDoInicio]);

  const buscarProximaPagina = useCallback(
    async (acao: "proximaPagina" | "retry") => {
      if (carregandoInicial || buscaEmVooRef.current) return;
      if (pagina >= totalPaginas) return;

      buscaEmVooRef.current = true;
      setBuscandoProximaPagina(acao);
      setErro(null);
      try {
        const proxima = pagina + 1;
        const resposta = await ConversaService.listar({ page: proxima, limit: LIMITE_POR_PAGINA });
        setConversas((atual) => acumularPagina(atual, resposta.conversas));
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar mais conversas."));
      } finally {
        buscaEmVooRef.current = false;
        setBuscandoProximaPagina(null);
      }
    },
    [carregandoInicial, pagina, totalPaginas],
  );

  // `useCallback` junto do `memo` de `ItemConversa`. O item já calcula o nome do outro participante
  // e o repassa, então este handler só depende de `navigation` (ver `FeedScreen.tsx`).
  const abrirConversa = useCallback(
    (conversaId: string, nomeOutro: string) => {
      navigation.navigate("Conversation", { conversaId, nomeOutroParticipante: nomeOutro });
    },
    [navigation],
  );

  if (carregandoInicial) {
    return <EstadoCarregamento />;
  }

  if (erro && conversas.length === 0) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar suas conversas"
        mensagem={erro}
        onTentarNovamente={() => void recarregarDoInicio(false)}
      />
    );
  }

  return (
    <ContainerTela>
      <CabecalhoTela titulo="Mensagens" style={{ marginBottom: tema.spacing.sm }} />
      <FlatList
        testID="conversas-lista"
        data={conversas}
        keyExtractor={(conversa) => conversa.id}
        // Mesmo ajuste do `FeedScreen.tsx`, onde está o motivo.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: tema.spacing.sm, paddingVertical: tema.spacing.md }}
        onEndReachedThreshold={0.4}
        onEndReached={() => void buscarProximaPagina("proximaPagina")}
        refreshControl={
          <RefreshControl
            testID="conversas-refresh"
            refreshing={atualizando}
            onRefresh={() => void recarregarDoInicio(true)}
            colors={[tema.colors.primary.solid]}
          />
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo="Nenhuma conversa ainda"
            descricao="Suas conversas com outras pessoas e empresas do ACESSO vão aparecer aqui."
          />
        }
        renderItem={({ item }) => (
          // `onPress` passado direto: o item chama `onPress(conversa.id, nome)`. Ver `FeedScreen.tsx`.
          <ItemConversa conversa={item} meuId={usuario?.id} tema={tema} onPress={abrirConversa} />
        )}
        ListFooterComponent={
          <View style={{ gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
            {buscandoProximaPagina === "proximaPagina" ? <ActivityIndicator color={tema.colors.primary.solid} /> : null}
            {erro && conversas.length > 0 ? (
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
                Você chegou ao fim das conversas.
              </Text>
            ) : null}
          </View>
        }
      />
    </ContainerTela>
  );
}

/**
 * Conversa na lista, com `memo`: cada `mensagem:nova` recarrega a lista inteira, e sem o memo e o
 * `onPress` estável todas as linhas visíveis renderizariam de novo.
 */
const ItemConversa = memo(function ItemConversa({
  conversa,
  meuId,
  tema,
  onPress,
}: {
  conversa: Conversa;
  meuId: string | undefined;
  tema: Tema;
  onPress: (conversaId: string, nomeOutro: string) => void;
}) {
  const outro = outroParticipante(conversa, meuId);
  const nome = nomeExibicao(outro);
  const foto = fotoExibicao(outro);
  const naoLidas = conversa.mensagensNaoLidas;

  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(conversa.id, nome)}
        accessibilityRole="button"
        // O rótulo do Pressable substitui o texto dos filhos no leitor de tela, então a prévia
        // entra aqui também: sem isso, quem usa leitor de tela ouviria só o nome.
        accessibilityLabel={`Conversa com ${nome}${naoLidas > 0 ? `, ${naoLidas} mensagem${naoLidas === 1 ? "" : "s"} não lida${naoLidas === 1 ? "" : "s"}` : ""}${conversa.ultimaMensagemPrevia ? `. Última mensagem: ${conversa.ultimaMensagemPrevia}` : ""}`}
        android_ripple={{ color: tema.colors.divider }}
      >
        <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
          <Avatar nome={nome} fotoUrl={foto} size="medium" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={[tema.typography.body, { color: tema.colors.textPrimary, fontWeight: naoLidas > 0 ? "700" : "400" }]}
              numberOfLines={1}
            >
              {nome}
            </Text>
            {conversa.ultimaMensagemPrevia ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]} numberOfLines={1}>
                {conversa.ultimaMensagemPrevia}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            {conversa.ultimaMensagemEm ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{formatarHorarioOuData(conversa.ultimaMensagemEm)}</Text>
            ) : null}
            {naoLidas > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: 10,
                  backgroundColor: tema.colors.primary.solid,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[tema.typography.caption, { color: tema.colors.primary.onSolid, fontWeight: "700" }]}>{naoLidas}</Text>
              </View>
            ) : null}
          </View>
        </Cartao>
      </Pressable>
    </View>
  );
});
