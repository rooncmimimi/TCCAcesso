import { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  ScreenContainer,
  ScreenHeader,
  SegmentedControl,
} from "../components/ui";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";
import { formatarTempoRelativo } from "../utils/tempoRelativo";
import {
  CONTRATO_LABEL,
  MODALIDADE_LABEL,
  PUBLICO_ALVO_LABEL,
  RECURSO_ACESSIBILIDADE_LABEL,
  VagasService,
} from "../vagas";
import type { ContratoVaga, ListarVagasParametros, ModalidadeVaga, PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga } from "../vagas";

const LIMITE_POR_PAGINA = 10;

/** Qual ação está em voo agora — `null` quando nada está carregando. Serve
 * pra duas coisas ao mesmo tempo: desabilitar TODOS os controles enquanto
 * qualquer busca está em andamento (evita chamadas concorrentes/duplo
 * toque, Fase 9 item 3) e mostrar o spinner só no botão que o usuário
 * realmente tocou (feedback visual por ação, não um spinner genérico).
 * `"filtro"` (Fase R1) cobre busca textual e os filtros do modal — nenhum
 * botão específico tem `loading` amarrado a ela (o modal já fechou quando a
 * busca começa), por isso vira um `ActivityIndicator` no lugar do contador. */
type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry" | "atualizar" | "filtro";

/** Estado local dos filtros do modal (Fase R1) — `""` em cada campo de enum
 * significa "qualquer" (sem filtro), nunca enviado à API (ver
 * `construirParametros`). Não inclui a busca textual: essa tem seu próprio
 * campo sempre visível, fora do modal. */
interface FiltrosVagas {
  cidade: string;
  modalidade: ModalidadeVaga | "";
  contrato: ContratoVaga | "";
  publicoAlvo: PublicoAlvoVaga | "";
  recursosAcessibilidade: RecursoAcessibilidadeVaga[];
}

const FILTROS_VAZIOS: FiltrosVagas = {
  cidade: "",
  modalidade: "",
  contrato: "",
  publicoAlvo: "",
  recursosAcessibilidade: [],
};

const OPCOES_MODALIDADE: { label: string; value: ModalidadeVaga | "" }[] = [
  { label: "Qualquer", value: "" },
  ...(Object.keys(MODALIDADE_LABEL) as ModalidadeVaga[]).map((valor) => ({ label: MODALIDADE_LABEL[valor], value: valor })),
];
const OPCOES_CONTRATO: { label: string; value: ContratoVaga | "" }[] = [
  { label: "Qualquer", value: "" },
  ...(Object.keys(CONTRATO_LABEL) as ContratoVaga[]).map((valor) => ({ label: CONTRATO_LABEL[valor], value: valor })),
];
const OPCOES_PUBLICO_ALVO: { label: string; value: PublicoAlvoVaga | "" }[] = [
  { label: "Qualquer", value: "" },
  ...(Object.keys(PUBLICO_ALVO_LABEL) as PublicoAlvoVaga[]).map((valor) => ({ label: PUBLICO_ALVO_LABEL[valor], value: valor })),
];
const OPCOES_RECURSOS = Object.keys(RECURSO_ACESSIBILIDADE_LABEL) as RecursoAcessibilidadeVaga[];

/** Quantos filtros do MODAL estão ativos agora — usado só pro selo do botão "Filtros" (a busca textual já mostra o próprio texto digitado, não precisa contar aqui). */
function contarFiltrosAtivos(filtros: FiltrosVagas): number {
  return [
    filtros.cidade.trim() !== "",
    filtros.modalidade !== "",
    filtros.contrato !== "",
    filtros.publicoAlvo !== "",
    filtros.recursosAcessibilidade.length > 0,
  ].filter(Boolean).length;
}

/** Monta os parâmetros reais da API (Fase R1) — só inclui um campo quando
 * ele de fato tem valor; nunca envia `""`/array vazio (equivalente a "sem
 * filtro" para o backend, mas mais limpo não mandar o parâmetro à toa). */
function construirParametros(pagina: number, texto: string, filtros: FiltrosVagas): ListarVagasParametros {
  const parametros: ListarVagasParametros = { page: pagina, limit: LIMITE_POR_PAGINA };
  if (texto.trim()) parametros.search = texto.trim();
  if (filtros.cidade.trim()) parametros.cidade = filtros.cidade.trim();
  if (filtros.modalidade) parametros.modalidade = filtros.modalidade;
  if (filtros.contrato) parametros.contrato = filtros.contrato;
  if (filtros.publicoAlvo) parametros.publicoAlvo = filtros.publicoAlvo;
  if (filtros.recursosAcessibilidade.length > 0) parametros.recursosAcessibilidade = filtros.recursosAcessibilidade;
  return parametros;
}

/**
 * `Jobs` (a aba) precisa navegar para `VagaDetail`, que mora no Stack PAI
 * (`AppStackParamList`), não dentro da própria tab — por isso o tipo de
 * navegação é composto (`CompositeScreenProps`), não só
 * `BottomTabScreenProps`. Padrão oficial do React Navigation v7 pra esse
 * cenário (tela de uma tab que precisa empilhar uma tela do Stack pai).
 */
type JobsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "Jobs">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Primeiro módulo de conteúdo real do App (Fase 9) — substitui o placeholder
 * das fases anteriores. Lista vagas abertas com paginação clássica (a API já
 * entrega `pagina`/`totalPaginas`/`total` prontos pra isso — sem
 * infinite-scroll). Candidatar-se e favoritar vivem só em
 * `VagaDetailScreen`, não aqui: mostrar favoritar em cada item da lista
 * multiplicaria o problema já documentado de "estado inicial desconhecido"
 * (a API não informa se a vaga já está favoritada) por N itens ao mesmo
 * tempo — um único botão no detalhe é mais honesto.
 *
 * Fase R1 (recomendada) — filtros e busca: usa só os parâmetros que `GET
 * /vagas` já aceita de verdade (`VagaService.findAll`, auditado antes de
 * escrever qualquer código aqui) — busca textual, cidade, modalidade,
 * contrato, público-alvo e recursos de acessibilidade. Aplicar um filtro
 * (ou buscar por texto) sempre volta pra página 1 — é uma consulta nova,
 * não continuação da paginação anterior.
 */
export function JobsScreen({ navigation }: JobsScreenProps) {
  const { theme } = useTheme();

  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState<AcaoBusca | null>("inicial");
  const [primeiroCarregamentoConcluido, setPrimeiroCarregamentoConcluido] = useState(false);

  const [textoBusca, setTextoBusca] = useState("");
  const [filtros, setFiltros] = useState<FiltrosVagas>(FILTROS_VAZIOS);
  const [filtrosRascunho, setFiltrosRascunho] = useState<FiltrosVagas>(FILTROS_VAZIOS);
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false);

  /** Recebe os filtros/texto a usar EXPLICITAMENTE (não lê `filtros`/
   * `textoBusca` do closure) — necessário porque aplicar um filtro novo
   * precisa buscar com o valor RECÉM-ESCOLHIDO no mesmo gesto, antes que o
   * componente re-renderize com o estado atualizado (senão a busca usaria o
   * filtro antigo, um closure obsoleto clássico). Por isso não depende de
   * `filtros`/`textoBusca` e pode ficar com `useCallback([])` de verdade. */
  const buscar = useCallback(
    async (paginaAlvo: number, acao: AcaoBusca, filtrosParaUsar: FiltrosVagas, textoParaUsar: string) => {
      setBuscando(acao);
      setErro(null);
      try {
        const resposta = await VagasService.listar(construirParametros(paginaAlvo, textoParaUsar, filtrosParaUsar));
        setVagas(resposta.vagas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        // Fase 9, item 8: uma falha ao trocar de página/filtro NUNCA apaga a
        // lista atual — `vagas`/`pagina`/`totalPaginas` só são sobrescritos
        // no bloco de sucesso acima.
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar as vagas."));
      } finally {
        setBuscando(null);
        setPrimeiroCarregamentoConcluido(true);
      }
    },
    [],
  );

  // Busca da MONTAGEM: função declarada dentro do próprio efeito (mesmo
  // padrão de `AuthProvider.tsx`), não uma chamada a `buscar` de fora —
  // chamar uma função externa que faz `setState` a partir de um efeito
  // aciona o lint `react-hooks/set-state-in-effect` (cascata de renders);
  // com a função inline, o linter consegue ver que todo `setState` roda
  // depois do primeiro `await`, então não acusa nada. `buscando`/`erro` já
  // nascem corretos (`"inicial"`/`null`) pelo valor padrão do `useState`,
  // então não precisam ser reatribuídos aqui antes do `await`.
  useEffect(() => {
    let cancelado = false;

    async function carregarInicial() {
      try {
        const resposta = await VagasService.listar({ page: 1, limit: LIMITE_POR_PAGINA });
        if (cancelado) return;
        setVagas(resposta.vagas);
        setPagina(resposta.pagina);
        setTotalPaginas(resposta.totalPaginas);
        setTotal(resposta.total);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar as vagas."));
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

  // Fase 25 (performance) — `useCallback` + `React.memo` no `VagaListItem`:
  // sem isto, cada troca de página/filtro passaria um `onPress` NOVO a cada
  // item, invalidando o memo. Ver a explicação completa em `HomeScreen.tsx`.
  // `[navigation]` é estável durante a vida da tela (garantia do React Navigation).
  const abrirDetalhe = useCallback(
    (vagaId: string) => {
      navigation.navigate("VagaDetail", { vagaId });
    },
    [navigation],
  );

  function submeterBusca() {
    void buscar(1, "filtro", filtros, textoBusca);
  }

  function abrirFiltros() {
    setFiltrosRascunho(filtros);
    setModalFiltrosAberto(true);
  }

  function aplicarFiltros() {
    setModalFiltrosAberto(false);
    setFiltros(filtrosRascunho);
    void buscar(1, "filtro", filtrosRascunho, textoBusca);
  }

  function limparFiltros() {
    setModalFiltrosAberto(false);
    setFiltrosRascunho(FILTROS_VAZIOS);
    setFiltros(FILTROS_VAZIOS);
    setTextoBusca("");
    void buscar(1, "filtro", FILTROS_VAZIOS, "");
  }

  const filtrosAtivos = contarFiltrosAtivos(filtros);
  const algumFiltroAtivo = filtrosAtivos > 0 || textoBusca.trim() !== "";

  // Fase 9, item 9: primeiro carregamento é tela cheia de loading, sem lista
  // nenhuma por baixo — só acontece uma vez, antes de `primeiroCarregamentoConcluido`.
  if (!primeiroCarregamentoConcluido) {
    return <LoadingState />;
  }

  // Erro logo no primeiro carregamento (nunca chegou a ter nenhuma vaga) —
  // tela cheia de erro, diferente do erro de uma troca de página/filtro (abaixo).
  if (erro && vagas.length === 0 && !algumFiltroAtivo) {
    return (
      <ErrorState
        title="Não foi possível carregar as vagas"
        message={erro}
        onRetry={() => void buscar(1, "retry", filtros, textoBusca)}
        retrying={buscando === "retry"}
      />
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Vagas" subtitle={total > 0 ? `${total} oportunidade${total === 1 ? "" : "s"} encontrada${total === 1 ? "" : "s"}` : undefined} />
      <View style={{ flexDirection: "row", gap: theme.spacing.sm, alignItems: "flex-end", marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            value={textoBusca}
            onChangeText={setTextoBusca}
            placeholder="Buscar por título, descrição..."
            accessibilityLabel="Buscar vagas por palavra-chave"
            returnKeyType="search"
            onSubmitEditing={submeterBusca}
            editable={buscando === null}
          />
        </View>
        <Button variant="outline" size="small" onPress={submeterBusca} disabled={buscando !== null}>
          Buscar
        </Button>
        <Button
          variant={filtrosAtivos > 0 ? "primary" : "outline"}
          size="small"
          onPress={abrirFiltros}
          disabled={buscando !== null}
          accessibilityLabel={filtrosAtivos > 0 ? `Filtros, ${filtrosAtivos} ativos` : "Filtros"}
        >
          {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : "Filtros"}
        </Button>
      </View>

      <FlatList
        testID="vagas-lista"
        data={vagas}
        keyExtractor={(vaga) => vaga.id}
        // Fase 25 (performance) — ver o mesmo ajuste, com a razão completa, em `HomeScreen.tsx`.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
        // Fase 26 (polish) — puxar para atualizar refaz a MESMA página que
        // já está aberta (não pula pra página 1 sozinho): paginação
        // clássica é uma navegação explícita do usuário, atualizar não deve
        // desfazer isso. Mantém os filtros/busca atuais.
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar", filtros, textoBusca)}
            colors={[theme.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          buscando === "filtro" ? (
            <ActivityIndicator color={theme.colors.primary.solid} style={{ marginBottom: theme.spacing.sm }} />
          ) : total > 0 ? (
            <Text
              // Fase 8: contador é texto MUDANDO num nó que persiste entre
              // trocas de página (o próprio cabeçalho do FlatList) — o caso
              // de uso que a política já definida chama de liveRegion, não
              // announceForAccessibility.
              accessibilityLiveRegion="polite"
              style={[theme.typography.bodySmall, { color: theme.colors.textMuted, marginBottom: theme.spacing.sm }]}
            >
              {`${total} vaga${total === 1 ? "" : "s"} encontrada${total === 1 ? "" : "s"}${
                totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""
              }`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          buscando === "filtro" ? null : (
            <EmptyState
              title="Nenhuma vaga encontrada"
              description={
                algumFiltroAtivo
                  ? "Nenhuma vaga corresponde à busca ou aos filtros atuais."
                  : "Ainda não há vagas abertas no momento. Volte mais tarde."
              }
              action={algumFiltroAtivo ? { label: "Limpar filtros", onPress: limparFiltros } : undefined}
            />
          )
        }
        renderItem={({ item }) => (
          // `onPress` passado DIRETO (não `() => abrirDetalhe(item.id)`) — o
          // item chama `onPress(vaga.id)` internamente. Ver `HomeScreen.tsx`.
          <VagaListItem vaga={item} theme={theme} onPress={abrirDetalhe} />
        )}
        ListFooterComponent={
          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            {totalPaginas > 1 ? (
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void buscar(pagina - 1, "anterior", filtros, textoBusca)}
                  loading={buscando === "anterior"}
                  disabled={buscando !== null || pagina <= 1}
                >
                  Página anterior
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onPress={() => void buscar(pagina + 1, "proxima", filtros, textoBusca)}
                  loading={buscando === "proxima"}
                  disabled={buscando !== null || pagina >= totalPaginas}
                >
                  Próxima página
                </Button>
              </View>
            ) : null}
            {/* Erro de uma troca de página/filtro — a lista acima continua visível, só isto aparece junto. */}
            {erro && (vagas.length > 0 || algumFiltroAtivo) ? (
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
                  onPress={() => void buscar(pagina, "retry", filtros, textoBusca)}
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

      <Modal visible={modalFiltrosAberto} transparent animationType="slide" onRequestClose={() => setModalFiltrosAberto(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, maxHeight: "85%" }}>
            <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.textPrimary }]}>
                  Filtrar vagas
                </Text>
                <Pressable
                  onPress={() => setModalFiltrosAberto(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar filtros"
                  // Rodada 3, item 8 — texto `button` (~22dp de altura) com
                  // hitSlop 10 fechava só 42dp; 13 de cada lado chega aos 48dp do app.
                  hitSlop={13}
                >
                  <Text style={[theme.typography.button, { color: theme.colors.primary.solid }]}>Fechar</Text>
                </Pressable>
              </View>

              <Input
                label="Cidade"
                value={filtrosRascunho.cidade}
                onChangeText={(valor) => setFiltrosRascunho((atual) => ({ ...atual, cidade: valor }))}
                placeholder="Ex.: São Paulo"
              />

              <SegmentedControl
                label="Modalidade"
                value={filtrosRascunho.modalidade}
                onChange={(valor) => setFiltrosRascunho((atual) => ({ ...atual, modalidade: valor }))}
                options={OPCOES_MODALIDADE}
              />
              <SegmentedControl
                label="Contrato"
                value={filtrosRascunho.contrato}
                onChange={(valor) => setFiltrosRascunho((atual) => ({ ...atual, contrato: valor }))}
                options={OPCOES_CONTRATO}
              />
              <SegmentedControl
                label="Público-alvo"
                value={filtrosRascunho.publicoAlvo}
                onChange={(valor) => setFiltrosRascunho((atual) => ({ ...atual, publicoAlvo: valor }))}
                options={OPCOES_PUBLICO_ALVO}
              />

              <View style={{ gap: theme.spacing.xs }}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Recursos de acessibilidade</Text>
                {/* Semântica real da API (`Op.contains`, ver `src/vagas/types.ts`): a vaga precisa ter TODOS os
                    recursos marcados, não qualquer um deles — deixa isso explícito para não parecer "ou" (o mais
                    intuitivo ao marcar várias caixas). */}
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                  Mostra só vagas que tenham TODOS os recursos marcados abaixo.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
                  {OPCOES_RECURSOS.map((recurso) => {
                    const selecionado = filtrosRascunho.recursosAcessibilidade.includes(recurso);
                    return (
                      <Pressable
                        key={recurso}
                        onPress={() =>
                          setFiltrosRascunho((atual) => ({
                            ...atual,
                            recursosAcessibilidade: selecionado
                              ? atual.recursosAcessibilidade.filter((item) => item !== recurso)
                              : [...atual.recursosAcessibilidade, recurso],
                          }))
                        }
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selecionado }}
                        accessibilityLabel={RECURSO_ACESSIBILIDADE_LABEL[recurso]}
                        android_ripple={{ color: theme.colors.divider }}
                        style={{
                          minHeight: theme.sizes.touchTarget,
                          paddingHorizontal: theme.spacing.md,
                          borderRadius: theme.radius.md,
                          borderWidth: selecionado ? 2 : 1,
                          borderColor: selecionado ? theme.colors.primary.solid : theme.colors.border,
                          backgroundColor: selecionado ? theme.colors.primary.soft : theme.colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={[
                            theme.typography.bodySmall,
                            { color: selecionado ? theme.colors.primary.onSoft : theme.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
                          ]}
                        >
                          {RECURSO_ACESSIBILIDADE_LABEL[recurso]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button variant="outline" onPress={limparFiltros}>
                    Limpar filtros
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button onPress={aplicarFiltros}>Aplicar filtros</Button>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/**
 * Função local, não exportada — só `JobsScreen` consome. `src/vagas/` fica
 * flat (igual `src/auth/`), sem subpasta `components/`, então este card não
 * vira um arquivo próprio por ter um único consumidor.
 *
 * `React.memo` (Fase 25, performance) — mesma razão de `PostagemListItem` em
 * `HomeScreen.tsx`: com o `onPress` estável (`useCallback` no pai) e
 * recebendo o `id` como parâmetro em vez de uma closure por item, só a
 * linha cujo objeto `vaga` mudou reprocessa numa troca de página/filtro.
 */
/**
 * `salario` é `DECIMAL(10,2)` no Postgres — chega como string no JSON
 * (`"3500.00"`), não `number`. Nunca formatar direto; se não der pra
 * converter, omite o campo em vez de mostrar "R$ NaN" (mesmo padrão/mesma
 * duplicação de propósito de `VagaDetailScreen.tsx`).
 */
function formatarSalario(valor: Vaga["salario"]): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

const VagaListItem = memo(function VagaListItem({
  vaga,
  theme,
  onPress,
}: {
  vaga: Vaga;
  theme: Theme;
  onPress: (vagaId: string) => void;
}) {
  const empresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa não informada";
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const modalidade = MODALIDADE_LABEL[vaga.modalidade] ?? vaga.modalidade;
  const publicoAlvoLabel =
    vaga.publicoAlvo && vaga.publicoAlvo !== "geral" ? PUBLICO_ALVO_LABEL[vaga.publicoAlvo] : null;
  const salarioFormatado = formatarSalario(vaga.salario);
  const tempo = formatarTempoRelativo(vaga.dataPublicacao);
  // Até 2 (mesmo limite do Site, `VagaCard.tsx`) — o resto fica só no
  // detalhe. "outro" nunca aparece aqui: é o valor "não descrito" do
  // catálogo, não um recurso real para destacar num card.
  const recursos = (vaga.recursosAcessibilidade ?? []).filter((r) => r !== "outro").slice(0, 2);

  // Fase 9, item 17: o item inteiro precisa ser UMA unidade compreensível
  // pro leitor de tela, não uma pilha de `Text` separados — por isso o
  // `Pressable` externo recebe `accessibilityRole`/`accessibilityLabel`
  // próprios (o RN já une os filhos visuais num nó só quando o pai é
  // acessível com role definida) em vez de confiar só na leitura visual.
  const rotulo = [
    vaga.titulo,
    empresa,
    local || null,
    modalidade,
    salarioFormatado,
    publicoAlvoLabel,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    // `overflow:"hidden"` + `borderRadius` no wrapper (não no Pressable) é o
    // que faz o `android_ripple` respeitar os cantos arredondados do Card
    // por baixo — sem isso o ripple "vaza" quadrado por cima do card redondo.
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(vaga.id)}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        android_ripple={{ color: theme.colors.divider }}
      >
        <Card elevation="sm" style={{ gap: theme.spacing.sm, padding: theme.spacing.md }}>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            {/* Sem logo real na API de listagem (`EmpresaResumoVaga` só traz
                nome/verificação) — iniciais da empresa como "logo" provisório,
                mesmo tratamento visual que qualquer pessoa sem foto já recebe
                (`Avatar`), nunca um espaço vazio. */}
            <Avatar nome={empresa} size="medium" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                {vaga.titulo}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {empresa}
                </Text>
                {vaga.empresa?.empresaVerificada ? (
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary.solid} accessibilityLabel="Empresa verificada" />
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Ionicons name="location-outline" size={theme.sizes.iconSmall} color={theme.colors.textMuted} />
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
              {local ? `${local} · ${modalidade}` : modalidade}
            </Text>
          </View>

          {salarioFormatado ? (
            <Text style={[theme.typography.label, { color: theme.colors.success.onSoft }]}>{salarioFormatado}</Text>
          ) : null}

          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {vaga.descricao}
          </Text>

          {publicoAlvoLabel || recursos.length > 0 || tempo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, flexWrap: "wrap" }}>
              {publicoAlvoLabel ? <Badge variant="info">{publicoAlvoLabel}</Badge> : null}
              {recursos.map((recurso) => (
                <Badge key={recurso} variant="neutral">
                  {RECURSO_ACESSIBILIDADE_LABEL[recurso]}
                </Badge>
              ))}
              {tempo ? (
                <Text style={[theme.typography.caption, { color: theme.colors.textMuted, marginLeft: "auto" }]}>
                  {tempo}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Puramente visual (item 7 do redesign: "o botão principal deve
              ser claramente identificável") — a NAVEGAÇÃO real já é o
              `Pressable` do card inteiro, com um `accessibilityLabel`
              completo (título, empresa, local, modalidade, salário). Um
              segundo elemento com role="button" aqui duplicaria a mesma
              parada para quem usa TalkBack/VoiceOver (dois anúncios pro
              mesmo destino) — escondido da árvore de acessibilidade
              (`importantForAccessibility="no-hide-descendants"`), nunca do
              toque real: continua clicável normalmente para quem usa mouse/
              toque direto, só não vira um segundo alvo de foco/leitura. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Button size="small" onPress={() => onPress(vaga.id)}>
              Ver vaga
            </Button>
          </View>
        </Card>
      </Pressable>
    </View>
  );
});
