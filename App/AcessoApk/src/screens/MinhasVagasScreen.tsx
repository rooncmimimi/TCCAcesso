import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Etiqueta, Botao, Cartao, EstadoVazio, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import type { VarianteEtiqueta } from "../components/ui";
import type { PerfilStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import { ROTULOS_STATUS_VAGA, VagasService } from "../vagas";
import type { VagaComContagem } from "../vagas";

const LIMITE_POR_PAGINA = 10;

type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry" | "atualizar";

type MyJobsScreenProps = NativeStackScreenProps<PerfilStackParamList, "MyJobs">;

const VARIANTE_STATUS: Record<VagaComContagem["status"], VarianteEtiqueta> = {
  aberta: "success",
  pausada: "warning",
  encerrada: "neutral",
};

/**
 * Vagas da própria empresa, com paginação por página como em `VagasScreen.tsx`. Não consulta o
 * `statusAprovacao` antes: se a empresa não estiver aprovada, `GET /vagas/minhas` já responde 403
 * com a mensagem certa, que vira o estado de erro da tela.
 */
export function MinhasVagasScreen({ navigation }: MyJobsScreenProps) {
  const { tema } = useTema();

  const [vagas, setVagas] = useState<VagaComContagem[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<AcaoBusca | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const buscar = useCallback(async (paginaAlvo: number, acao: AcaoBusca) => {
    setBuscando(acao);
    setErro(null);
    try {
      const resposta = await VagasService.minhas({ page: paginaAlvo, limit: LIMITE_POR_PAGINA });
      setVagas(resposta.vagas);
      setPagina(resposta.pagina);
      setTotalPaginas(resposta.totalPaginas);
      setTotal(resposta.total);
    } catch (erroRequisicao) {
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas vagas."));
    } finally {
      setBuscando(null);
      setPrimeiroCarregamentoConcluido(true);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await VagasService.minhas({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setVagas(resposta.vagas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar suas vagas."));
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

  function novaVaga() {
    navigation.navigate("JobForm", {});
  }

  // `useCallback` junto do `memo` de `MinhaVagaItem`, que é renderizado por `.map()` e recriado a
  // cada atualização ou troca de página (ver `FeedScreen.tsx`). `navigation` é estável.
  const abrirCandidaturas = useCallback(
    (vagaId: string, vagaTitulo: string) => {
      navigation.navigate("JobApplicants", { vagaId, vagaTitulo });
    },
    [navigation],
  );

  if (!primeiroCarregamentoConcluido) {
    return <EstadoCarregamento />;
  }

  if (erro && vagas.length === 0) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar suas vagas"
        mensagem={erro}
        onTentarNovamente={() => void buscar(1, "retry")}
        tentandoNovamente={buscando === "retry"}
      />
    );
  }

  return (
    <ContainerTela>
      <ScrollView
        testID="minhas-vagas-scroll"
        contentContainerStyle={{ gap: tema.spacing.sm, paddingVertical: tema.spacing.md, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar")}
            colors={[tema.colors.primary.solid]}
          />
        }
      >
        <Botao onPress={novaVaga}>Nova vaga</Botao>

        {total > 0 ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}
          >
            {`${total} vaga${total === 1 ? "" : "s"}${totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""}`}
          </Text>
        ) : null}

        {vagas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma vaga publicada ainda"
            descricao="Toque em Nova vaga para publicar a primeira oportunidade da sua empresa."
          />
        ) : (
          // `onPress` passado direto: o item chama `onPress(vaga.id, vaga.titulo)`. Ver `FeedScreen.tsx`.
          vagas.map((vaga) => <MinhaVagaItem key={vaga.id} vaga={vaga} tema={tema} onPress={abrirCandidaturas} />)
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

        {erro && vagas.length > 0 ? (
          <View style={{ gap: tema.spacing.xs }}>
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[tema.typography.caption, { color: tema.colors.error.solid }]}>
              {erro}
            </Text>
            <Botao variant="outline" size="small" onPress={() => void buscar(pagina, "retry")} carregando={buscando === "retry"} disabled={buscando !== null}>
              Tentar novamente
            </Botao>
          </View>
        ) : null}
      </ScrollView>
    </ContainerTela>
  );
}

/**
 * Item de vaga com `memo`: o `onPress` estável recebe `id` e `titulo` como parâmetros, então trocar
 * de página não renderiza as outras linhas de novo.
 */
const MinhaVagaItem = memo(function MinhaVagaItem({
  vaga,
  tema,
  onPress,
}: {
  vaga: VagaComContagem;
  tema: Tema;
  onPress: (vagaId: string, vagaTitulo: string) => void;
}) {
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(vaga.id, vaga.titulo)}
        accessibilityRole="button"
        accessibilityLabel={`${vaga.titulo}, ${ROTULOS_STATUS_VAGA[vaga.status]}, ${vaga.totalCandidaturas} candidatura${vaga.totalCandidaturas === 1 ? "" : "s"}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: tema.spacing.sm }}>
            <Text style={[tema.typography.title, { color: tema.colors.textPrimary, flex: 1 }]} numberOfLines={2}>
              {vaga.titulo}
            </Text>
            <Etiqueta variant={VARIANTE_STATUS[vaga.status]}>{ROTULOS_STATUS_VAGA[vaga.status]}</Etiqueta>
          </View>
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
            {vaga.totalCandidaturas} candidatura{vaga.totalCandidaturas === 1 ? "" : "s"}
          </Text>
        </Cartao>
      </Pressable>
    </View>
  );
});
