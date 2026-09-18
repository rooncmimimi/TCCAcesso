import { memo, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Avatar,
  Etiqueta,
  Botao,
  Cartao,
  EstadoVazio,
  EstadoErro,
  CampoTexto,
  EstadoCarregamento,
  ContainerTela,
  CabecalhoTela,
  ControleSegmentado,
} from "../components/ui";
import type { AppStackParamList, AbasParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";
import {
  ROTULOS_CONTRATO,
  ROTULOS_MODALIDADE,
  ROTULOS_PUBLICO_ALVO,
  ROTULOS_RECURSO_ACESSIBILIDADE,
  VagasService,
} from "../vagas";
import type { ContratoVaga, ListarVagasParametros, ModalidadeVaga, PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga } from "../vagas";
import { formatarSalario, formatarTempoRelativo } from "../utils/formatacao";

const LIMITE_POR_PAGINA = 10;

/**
 * Ação em andamento (`null` quando nada carrega). Serve para desabilitar todos os controles durante
 * qualquer busca, evitando chamadas simultâneas e toque duplo, e para mostrar o carregamento só no
 * botão tocado. `"filtro"` cobre a busca por texto e os filtros do modal; como o modal já fechou
 * quando a busca começa, o carregamento aparece no lugar do contador.
 */
type AcaoBusca = "inicial" | "anterior" | "proxima" | "retry" | "atualizar" | "filtro";

/**
 * Filtros do modal. `""` num campo de enum significa "qualquer" e nunca vai para a API (ver
 * `construirParametros`). A busca por texto fica fora, num campo sempre visível.
 */
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

const OPCOES_MODALIDADE: { rotulo: string; value: ModalidadeVaga | "" }[] = [
  { rotulo: "Qualquer", value: "" },
  ...(Object.keys(ROTULOS_MODALIDADE) as ModalidadeVaga[]).map((valor) => ({ rotulo: ROTULOS_MODALIDADE[valor], value: valor })),
];
const OPCOES_CONTRATO: { rotulo: string; value: ContratoVaga | "" }[] = [
  { rotulo: "Qualquer", value: "" },
  ...(Object.keys(ROTULOS_CONTRATO) as ContratoVaga[]).map((valor) => ({ rotulo: ROTULOS_CONTRATO[valor], value: valor })),
];
const OPCOES_PUBLICO_ALVO: { rotulo: string; value: PublicoAlvoVaga | "" }[] = [
  { rotulo: "Qualquer", value: "" },
  ...(Object.keys(ROTULOS_PUBLICO_ALVO) as PublicoAlvoVaga[]).map((valor) => ({ rotulo: ROTULOS_PUBLICO_ALVO[valor], value: valor })),
];
const OPCOES_RECURSOS = Object.keys(ROTULOS_RECURSO_ACESSIBILIDADE) as RecursoAcessibilidadeVaga[];

/** Quantos filtros do modal estão ativos agora: usado só pro selo do botão "Filtros" (a busca textual já mostra o próprio texto digitado, não precisa contar aqui). */
function contarFiltrosAtivos(filtros: FiltrosVagas): number {
  return [
    filtros.cidade.trim() !== "",
    filtros.modalidade !== "",
    filtros.contrato !== "",
    filtros.publicoAlvo !== "",
    filtros.recursosAcessibilidade.length > 0,
  ].filter(Boolean).length;
}

/**
 * Monta os parâmetros de `GET /vagas` só com os campos preenchidos; `""` e listas vazias não são
 * enviados.
 */
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
 * `Jobs` (a aba) precisa navegar para `VagaDetail`, que fica no stack pai (`AppStackParamList`), e
 * não dentro da própria aba; por isso o tipo de navegação é composto (`CompositeScreenProps`), e
 * não só `BottomTabScreenProps`. É o padrão do React Navigation v7 para uma tela de aba que precisa
 * empilhar uma tela do stack pai.
 */
type JobsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AbasParamList, "Jobs">,
  NativeStackScreenProps<AppStackParamList>
>;

/**
 * Lista de vagas abertas, com paginação por página (a API já devolve `pagina`, `totalPaginas` e
 * `total`). Candidatar-se e favoritar ficam só no detalhe: a API não diz se a vaga já foi
 * favoritada, e um botão por item multiplicaria esse estado desconhecido.
 *
 * Busca e filtros usam os parâmetros que `GET /vagas` aceita: texto, cidade, modalidade, contrato,
 * público-alvo e recursos de acessibilidade. Aplicar um filtro ou buscar sempre volta para a página
 * 1, porque é uma consulta nova.
 */
export function VagasScreen({ navigation }: JobsScreenProps) {
  const { tema } = useTema();

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

  /**
   * Recebe os filtros e o texto explicitamente (não lê `filtros` nem `textoBusca` do closure):
   * aplicar um filtro novo precisa buscar com o valor recém-escolhido no mesmo gesto, antes de o
   * componente renderizar de novo com o estado atualizado; senão a busca usaria o filtro antigo, o
   * clássico closure obsoleto. Por isso não depende de `filtros` nem de `textoBusca` e pode ficar
   * com `useCallback([])` de verdade.
   */
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
        // Uma falha ao trocar de página ou de filtro não apaga a lista atual: `vagas`, `pagina` e
        // `totalPaginas` só mudam no bloco de sucesso acima.
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar as vagas."));
      } finally {
        setBuscando(null);
        setPrimeiroCarregamentoConcluido(true);
      }
    },
    [],
  );

  // Busca da montagem: função declarada dentro do próprio efeito (mesmo
  // padrão de `AutenticacaoProvider.tsx`), não uma chamada a `buscar` de fora;
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
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar as vagas."));
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

  // `useCallback` junto do `memo` de `ItemVaga`: sem ele, cada troca de página ou filtro passaria
  // um `onPress` novo para cada item e invalidaria o memo (ver `FeedScreen.tsx`). `navigation` é
  // estável durante a vida da tela.
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

  // Primeira carga: tela cheia de carregamento, sem lista por baixo; só acontece antes de
  // `primeiroCarregamentoConcluido`.
  if (!primeiroCarregamentoConcluido) {
    return <EstadoCarregamento />;
  }

  // Erro logo no primeiro carregamento (nunca chegou a ter nenhuma vaga):
  // tela cheia de erro, diferente do erro de uma troca de página/filtro (abaixo).
  if (erro && vagas.length === 0 && !algumFiltroAtivo) {
    return (
      <EstadoErro
        titulo="Não foi possível carregar as vagas"
        mensagem={erro}
        onTentarNovamente={() => void buscar(1, "retry", filtros, textoBusca)}
        tentandoNovamente={buscando === "retry"}
      />
    );
  }

  return (
    <ContainerTela>
      <CabecalhoTela titulo="Vagas" subtitulo={total > 0 ? `${total} oportunidade${total === 1 ? "" : "s"} encontrada${total === 1 ? "" : "s"}` : undefined} />
      <View style={{ flexDirection: "row", gap: tema.spacing.sm, alignItems: "flex-end", marginTop: tema.spacing.sm, marginBottom: tema.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <CampoTexto
            value={textoBusca}
            onChangeText={setTextoBusca}
            placeholder="Buscar por título, descrição..."
            accessibilityLabel="Buscar vagas por palavra-chave"
            returnKeyType="search"
            onSubmitEditing={submeterBusca}
            editable={buscando === null}
          />
        </View>
        <Botao variant="outline" size="small" onPress={submeterBusca} disabled={buscando !== null}>
          Buscar
        </Botao>
        <Botao
          variant={filtrosAtivos > 0 ? "primary" : "outline"}
          size="small"
          onPress={abrirFiltros}
          disabled={buscando !== null}
          accessibilityLabel={filtrosAtivos > 0 ? `Filtros, ${filtrosAtivos} ativos` : "Filtros"}
        >
          {filtrosAtivos > 0 ? `Filtros (${filtrosAtivos})` : "Filtros"}
        </Botao>
      </View>

      <FlatList
        testID="vagas-lista"
        data={vagas}
        keyExtractor={(vaga) => vaga.id}
        // Mesmo ajuste do `FeedScreen.tsx`, onde está o motivo.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={{ flexGrow: 1, gap: tema.spacing.sm, paddingVertical: tema.spacing.md }}
        // Puxar para atualizar refaz a mesma página, com os mesmos filtros: a paginação é uma
        // escolha da pessoa, e atualizar não deve desfazê-la.
        refreshControl={
          <RefreshControl
            refreshing={buscando === "atualizar"}
            onRefresh={() => void buscar(pagina, "atualizar", filtros, textoBusca)}
            colors={[tema.colors.primary.solid]}
          />
        }
        ListHeaderComponent={
          buscando === "filtro" ? (
            <ActivityIndicator color={tema.colors.primary.solid} style={{ marginBottom: tema.spacing.sm }} />
          ) : total > 0 ? (
            <Text
              // O contador muda num nó que continua montado (o cabeçalho da lista), então
              // `accessibilityLiveRegion` basta, sem `anunciarParaLeitorDeTela`.
              accessibilityLiveRegion="polite"
              style={[tema.typography.bodySmall, { color: tema.colors.textMuted, marginBottom: tema.spacing.sm }]}
            >
              {`${total} vaga${total === 1 ? "" : "s"} encontrada${total === 1 ? "" : "s"}${
                totalPaginas > 1 ? ` — página ${pagina} de ${totalPaginas}` : ""
              }`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          buscando === "filtro" ? null : (
            <EstadoVazio
              titulo="Nenhuma vaga encontrada"
              descricao={
                algumFiltroAtivo
                  ? "Nenhuma vaga corresponde à busca ou aos filtros atuais."
                  : "Ainda não há vagas abertas no momento. Volte mais tarde."
              }
              acao={algumFiltroAtivo ? { rotulo: "Limpar filtros", onPress: limparFiltros } : undefined}
            />
          )
        }
        renderItem={({ item }) => (
          // `onPress` passado direto (não `() => abrirDetalhe(item.id)`): o
          // item chama `onPress(vaga.id)` internamente. Ver `FeedScreen.tsx`.
          <ItemVaga vaga={item} tema={tema} onPress={abrirDetalhe} />
        )}
        ListFooterComponent={
          <View style={{ gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
            {totalPaginas > 1 ? (
              <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void buscar(pagina - 1, "anterior", filtros, textoBusca)}
                  carregando={buscando === "anterior"}
                  disabled={buscando !== null || pagina <= 1}
                >
                  Página anterior
                </Botao>
                <Botao
                  variant="outline"
                  size="small"
                  onPress={() => void buscar(pagina + 1, "proxima", filtros, textoBusca)}
                  carregando={buscando === "proxima"}
                  disabled={buscando !== null || pagina >= totalPaginas}
                >
                  Próxima página
                </Botao>
              </View>
            ) : null}
            {/* Erro de uma troca de página/filtro: a lista acima continua visível, só isto aparece junto. */}
            {erro && (vagas.length > 0 || algumFiltroAtivo) ? (
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
                  onPress={() => void buscar(pagina, "retry", filtros, textoBusca)}
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

      <Modal visible={modalFiltrosAberto} transparent animationType="slide" onRequestClose={() => setModalFiltrosAberto(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: tema.colors.surface, borderTopLeftRadius: tema.radius.lg, borderTopRightRadius: tema.radius.lg, maxHeight: "85%" }}>
            <ScrollView contentContainerStyle={{ padding: tema.spacing.lg, gap: tema.spacing.md, paddingBottom: tema.spacing.xl }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text accessibilityRole="header" style={[tema.typography.heading, { color: tema.colors.textPrimary }]}>
                  Filtrar vagas
                </Text>
                <Pressable
                  onPress={() => setModalFiltrosAberto(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar filtros"
                  // Texto `button` com uns 22dp de altura: 13 de cada lado leva a área de toque a
                  // 48dp.
                  hitSlop={13}
                >
                  <Text style={[tema.typography.button, { color: tema.colors.primary.solid }]}>Fechar</Text>
                </Pressable>
              </View>

              <CampoTexto
                rotulo="Cidade"
                value={filtrosRascunho.cidade}
                onChangeText={(valor) => setFiltrosRascunho((atual) => ({ ...atual, cidade: valor }))}
                placeholder="Ex.: São Paulo"
              />

              <ControleSegmentado
                rotulo="Modalidade"
                value={filtrosRascunho.modalidade}
                onChange={(valor) => setFiltrosRascunho((atual) => ({ ...atual, modalidade: valor }))}
                opcoes={OPCOES_MODALIDADE}
              />
              <ControleSegmentado
                rotulo="Contrato"
                value={filtrosRascunho.contrato}
                onChange={(valor) => setFiltrosRascunho((atual) => ({ ...atual, contrato: valor }))}
                opcoes={OPCOES_CONTRATO}
              />
              <ControleSegmentado
                rotulo="Público-alvo"
                value={filtrosRascunho.publicoAlvo}
                onChange={(valor) => setFiltrosRascunho((atual) => ({ ...atual, publicoAlvo: valor }))}
                opcoes={OPCOES_PUBLICO_ALVO}
              />

              <View style={{ gap: tema.spacing.xs }}>
                <Text style={[tema.typography.label, { color: tema.colors.textSecondary }]}>Recursos de acessibilidade</Text>
                {/* Semântica real da API (`Op.contains`, ver `src/vagas/types.ts`): a vaga precisa ter todos os
                    recursos marcados, não qualquer um deles; deixa isso explícito para não parecer "ou" (o mais
                    intuitivo ao marcar várias caixas). */}
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                  Mostra só vagas que tenham TODOS os recursos marcados abaixo.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tema.spacing.xs }}>
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
                        accessibilityLabel={ROTULOS_RECURSO_ACESSIBILIDADE[recurso]}
                        android_ripple={{ color: tema.colors.divider }}
                        style={{
                          minHeight: tema.sizes.touchTarget,
                          paddingHorizontal: tema.spacing.md,
                          borderRadius: tema.radius.md,
                          borderWidth: selecionado ? 2 : 1,
                          borderColor: selecionado ? tema.colors.primary.solid : tema.colors.border,
                          backgroundColor: selecionado ? tema.colors.primary.soft : tema.colors.surface,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={[
                            tema.typography.bodySmall,
                            { color: selecionado ? tema.colors.primary.onSoft : tema.colors.textPrimary, fontWeight: selecionado ? "700" : "400" },
                          ]}
                        >
                          {ROTULOS_RECURSO_ACESSIBILIDADE[recurso]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: tema.spacing.sm, marginTop: tema.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Botao variant="outline" onPress={limparFiltros}>
                    Limpar filtros
                  </Botao>
                </View>
                <View style={{ flex: 1 }}>
                  <Botao onPress={aplicarFiltros}>Aplicar filtros</Botao>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ContainerTela>
  );
}

const ItemVaga = memo(function ItemVaga({
  vaga,
  tema,
  onPress,
}: {
  vaga: Vaga;
  tema: Tema;
  onPress: (vagaId: string) => void;
}) {
  const empresa = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa não informada";
  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const modalidade = ROTULOS_MODALIDADE[vaga.modalidade] ?? vaga.modalidade;
  const publicoAlvoLabel =
    vaga.publicoAlvo && vaga.publicoAlvo !== "geral" ? ROTULOS_PUBLICO_ALVO[vaga.publicoAlvo] : null;
  const salarioFormatado = formatarSalario(vaga.salario);
  const tempo = formatarTempoRelativo(vaga.criadoEm);
  // Até 2 (mesmo limite do Site, `VagaCard.tsx`): o resto fica só no
  // detalhe. "outro" nunca aparece aqui: é o valor "não descrito" do
  // catálogo, não um recurso real para destacar num card.
  const recursos = (vaga.recursosAcessibilidade ?? []).filter((r) => r !== "outro").slice(0, 2);

  // O item inteiro é uma unidade para o leitor de tela, e não uma sequência de `Text` soltos: o
  // `Pressable` externo recebe `accessibilityRole` e um `accessibilityLabel` completo.
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
    // que faz o `android_ripple` respeitar os cantos arredondados do Cartao
    // por baixo; sem isso o ripple "vaza" quadrado por cima do card redondo.
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onPress(vaga.id)}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        android_ripple={{ color: tema.colors.divider }}
      >
        <Cartao elevacao="sm" style={{ gap: tema.spacing.sm, padding: tema.spacing.md }}>
          <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
            {/* Mostra as iniciais da empresa no lugar do logo, como o `Avatar` faz com pessoas
                sem foto. A listagem do backend já envia `empresa.logo`, que o item ainda não
                usa. */}
            <Avatar nome={empresa} size="medium" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]} numberOfLines={2}>
                {vaga.titulo}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]} numberOfLines={1}>
                  {empresa}
                </Text>
                {vaga.empresa?.empresaVerificada ? (
                  <Ionicons name="checkmark-circle" size={14} color={tema.colors.primary.solid} accessibilityLabel="Empresa verificada" />
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Ionicons name="location-outline" size={tema.sizes.iconSmall} color={tema.colors.textMuted} />
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
              {local ? `${local} · ${modalidade}` : modalidade}
            </Text>
          </View>

          {salarioFormatado ? (
            <Text style={[tema.typography.label, { color: tema.colors.success.onSoft }]}>{salarioFormatado}</Text>
          ) : null}

          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]} numberOfLines={2}>
            {vaga.descricao}
          </Text>

          {publicoAlvoLabel || recursos.length > 0 || tempo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.xs, flexWrap: "wrap" }}>
              {publicoAlvoLabel ? <Etiqueta variant="info">{publicoAlvoLabel}</Etiqueta> : null}
              {recursos.map((recurso) => (
                <Etiqueta key={recurso} variant="neutral">
                  {ROTULOS_RECURSO_ACESSIBILIDADE[recurso]}
                </Etiqueta>
              ))}
              {tempo ? (
                <Text style={[tema.typography.caption, { color: tema.colors.textMuted, marginLeft: "auto" }]}>
                  {tempo}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Botão só visual, para a ação principal do card ficar evidente. A navegação é o
              `Pressable` do card, que já tem o rótulo completo; um segundo `role="button"`
              faria o TalkBack parar duas vezes no mesmo destino. Por isso fica fora da árvore
              de acessibilidade, mas continua respondendo ao toque. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Botao size="small" onPress={() => onPress(vaga.id)}>
              Ver vaga
            </Botao>
          </View>
        </Cartao>
      </Pressable>
    </View>
  );
});
