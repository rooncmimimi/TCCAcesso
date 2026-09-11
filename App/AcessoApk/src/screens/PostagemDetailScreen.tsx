import { Image } from "expo-image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { announceForAccessibility } from "../accessibility";
import { useAuth } from "../auth";
import { Button, Card, Divider, Input, ScreenContainer, SpeechButton } from "../components/ui";
import { FeedService } from "../feed";
import type { Comentario, FeedComentarioEvento, FeedCurtidaEvento, FeedPostagemEvento, Postagem, PostagemAnexo } from "../feed";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_COMENTARIOS = 50;

type PostagemDetailScreenProps = NativeStackScreenProps<AppStackParamList, "PostagemDetail">;

/** Mesmo cálculo de `HomeScreen.tsx` — duplicado aqui de propósito (`src/feed/`
 * fica flat, sem componente/util compartilhado só para isto, mesmo raciocínio
 * de `VagaListItem` ser local a `JobsScreen`). */
function iniciaisDoNome(nome: string | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}

/** Sem biblioteca de data nova (mesmo padrão de `VagaDetailScreen.tsx`) — `Intl.DateTimeFormat` nativo já resolve. */
function formatarData(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

/** Mesmo padrão de confirmação de exclusão já usado em `JobApplicantsScreen.tsx` (Fase 18) — duplicado aqui de propósito, mesmo raciocínio de `iniciaisDoNome`/`formatarData` acima. */
function confirmarExclusao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  Alert.alert(titulo, mensagem, [
    { text: "Cancelar", style: "cancel" },
    { text: "Excluir", style: "destructive", onPress: aoConfirmar },
  ]);
}

/**
 * Detalhe de uma publicação (Fase 10, mídia e tempo real na Fase 20) —
 * publicação e comentários carregam de forma INDEPENDENTE (dois pares
 * loading/erro próprios, duas buscas disparadas juntas, não uma depois da
 * outra): se só os comentários falharem, a publicação carregada continua
 * visível, com erro/retry restrito à seção de comentários.
 */
export function PostagemDetailScreen({ route, navigation }: PostagemDetailScreenProps) {
  const { postagemId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();

  const [postagem, setPostagem] = useState<Postagem | null>(null);
  const [erroPostagem, setErroPostagem] = useState<string | null>(null);
  const [carregandoPostagem, setCarregandoPostagem] = useState(true);
  const [tentativaPostagem, setTentativaPostagem] = useState(0);
  const [curtindo, setCurtindo] = useState(false);
  // Fase 20: alguém (outro dispositivo, ou moderação) removeu ESTA
  // publicação enquanto ela estava aberta aqui — nunca navega sozinho pra
  // trás (surpreenderia quem usa leitor de tela no meio da leitura); só
  // avisa e desabilita as ações que dependem da publicação ainda existir.
  const [removidaRemotamente, setRemovidaRemotamente] = useState(false);

  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [erroComentarios, setErroComentarios] = useState<string | null>(null);
  const [carregandoComentarios, setCarregandoComentarios] = useState(true);
  const [tentativaComentarios, setTentativaComentarios] = useState(0);

  const [novoComentario, setNovoComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [erroComentar, setErroComentar] = useState<string | null>(null);

  const [respondendoA, setRespondendoA] = useState<string | null>(null);
  const [textoResposta, setTextoResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const [erroResponder, setErroResponder] = useState<string | null>(null);

  // Fase R6 — excluir o próprio comentário/resposta (só excluir, sem editar).
  // `excluindoComentarioId` é só para o rótulo "Excluindo…"; a trava de "uma
  // exclusão por vez" usa um ref (Fase 25) para não trocar a identidade dos
  // handlers memoizados a cada início/fim de exclusão.
  const [excluindoComentarioId, setExcluindoComentarioId] = useState<string | null>(null);
  const [erroExcluirComentario, setErroExcluirComentario] = useState<string | null>(null);
  const excluindoComentarioRef = useRef(false);

  // Fase 20 — editar/excluir a própria publicação (texto só; anexos não são
  // editáveis por esta ação, ver `FeedService.atualizar`).
  const [editandoPostagem, setEditandoPostagem] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  // Fase 20 — visualização ampliada de um anexo (equivalente a um
  // lightbox), sem biblioteca nova: `Modal` + `Image` nativos já bastam para
  // uma imagem por vez, sem gesto de pinça (fora do escopo desta fase).
  const [anexoAmpliado, setAnexoAmpliado] = useState<PostagemAnexo | null>(null);

  // Busca da publicação — função inline dentro do próprio efeito (mesmo
  // padrão de `AuthProvider.tsx`/`VagaDetailScreen.tsx`), evita o lint
  // `react-hooks/set-state-in-effect`.
  useEffect(() => {
    let cancelado = false;

    async function carregarPostagem() {
      try {
        const resultado = await FeedService.obterPorId(postagemId);
        if (cancelado) return;
        setPostagem(resultado);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErroPostagem(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar esta publicação."));
      } finally {
        if (!cancelado) setCarregandoPostagem(false);
      }
    }

    void carregarPostagem();
    return () => {
      cancelado = true;
    };
  }, [postagemId, tentativaPostagem]);

  // Busca dos comentários — efeito PRÓPRIO e independente do de cima: as
  // duas buscas disparam juntas na montagem (React roda os dois efeitos no
  // mesmo commit), nunca uma esperando a outra terminar.
  useEffect(() => {
    let cancelado = false;

    async function carregarComentarios() {
      try {
        const resposta = await FeedService.listarComentarios(postagemId, { page: 1, limit: LIMITE_COMENTARIOS });
        if (cancelado) return;
        setComentarios(resposta.comentarios);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErroComentarios(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar os comentários."));
      } finally {
        if (!cancelado) setCarregandoComentarios(false);
      }
    }

    void carregarComentarios();
    return () => {
      cancelado = true;
    };
  }, [postagemId, tentativaComentarios]);

  /** Remove um comentário (ou resposta) da lista local pelo `id` — usado tanto
   * pela exclusão explícita do próprio usuário (Fase R6) quanto pelo evento
   * `feed:comentario` `removido` de tempo real (Fase 20). Idempotente: rodar
   * duas vezes com o mesmo `id` (a própria exclusão + o eco do socket) é
   * inofensivo. */
  const removerComentarioDoEstado = useCallback((idRemovido: string) => {
    setComentarios((atual) =>
      atual
        .filter((comentario) => comentario.id !== idRemovido)
        .map((comentario) =>
          comentario.respostas?.some((resposta) => resposta.id === idRemovido)
            ? { ...comentario, respostas: comentario.respostas.filter((resposta) => resposta.id !== idRemovido) }
            : comentario,
        ),
    );
  }, []);

  // Tempo real (Fase 20) — escopado a ESTA postagem (`evento.postagemId ===
  // postagemId`/`evento.id === postagemId`), diferente de `HomeScreen.tsx`
  // (que não sabe de antemão quais postagens estão na tela). Contagem de
  // curtida aplicada direto do payload (número não-sensível); comentário
  // criado remotamente não vem com dado suficiente pra inserir na hora (o
  // payload não identifica QUAL comentário nasceu, só a contagem — ver
  // `types.ts`), então vira um refetch silencioso da lista; comentário
  // removido vem com `comentarioId` e é só filtrado localmente (ele já
  // existia na lista, então o `id` sozinho basta, sem round-trip). Postagem
  // atualizada revalida via REST; removida vira um aviso, nunca navega
  // sozinho pra trás.
  useEffect(() => {
    const limparCurtida = ouvirEvento<FeedCurtidaEvento>("feed:curtida", (evento) => {
      if (evento.postagemId !== postagemId) return;
      setPostagem((atual) => (atual ? { ...atual, totalCurtidas: evento.totalCurtidas } : atual));
    });

    const limparComentario = ouvirEvento<FeedComentarioEvento>("feed:comentario", (evento) => {
      if (evento.postagemId !== postagemId) return;

      if (evento.removido && evento.comentarioId) {
        removerComentarioDoEstado(evento.comentarioId);
        return;
      }

      // Comentário criado por outra pessoa: sem `comentarioId` no payload,
      // não há como inserir pontualmente — refetch silencioso da lista
      // inteira (mesma filosofia de `MessagesScreen.tsx`, Fase 17).
      FeedService.listarComentarios(postagemId, { page: 1, limit: LIMITE_COMENTARIOS })
        .then((resposta) => setComentarios(resposta.comentarios))
        .catch(() => {
          // Falha aqui não é crítica — a lista só continua com o que já
          // tinha carregado (mesma filosofia de falhas silenciosas de
          // tempo real já usada em `HomeScreen.tsx`).
        });
    });

    const limparPostagem = ouvirEvento<FeedPostagemEvento>("feed:postagem", (evento) => {
      if (evento.id !== postagemId) return;

      if (evento.removida) {
        setRemovidaRemotamente(true);
        return;
      }

      if (evento.atualizada) {
        FeedService.obterPorId(postagemId)
          .then((atualizada) => setPostagem(atualizada))
          .catch(() => {
            // Idem: falha na revalidação não é crítica, mantém o que já tinha.
          });
      }
    });

    return () => {
      limparCurtida();
      limparComentario();
      limparPostagem();
    };
  }, [postagemId, removerComentarioDoEstado]);

  function tentarNovamentePostagem() {
    setErroPostagem(null);
    setCarregandoPostagem(true);
    setTentativaPostagem((valor) => valor + 1);
  }

  function tentarNovamenteComentarios() {
    setErroComentarios(null);
    setCarregandoComentarios(true);
    setTentativaComentarios((valor) => valor + 1);
  }

  /** Fase 14 — abre o perfil público do autor (da publicação ou de um comentário).
   * Fase 25: `useCallback` para o `React.memo` de `ComentarioItem` funcionar. */
  const abrirPerfil = useCallback(
    (usuarioId: string) => {
      navigation.navigate("PublicProfile", { usuarioId });
    },
    [navigation],
  );

  /** Fase 19 — genérico o bastante pra denunciar a publicação OU um comentário, sem duplicar a navegação. */
  const denunciar = useCallback(
    (entidadeTipo: "postagem" | "comentario", entidadeId: string, tituloAlvo?: string) => {
      navigation.navigate("Report", { entidadeTipo, entidadeId, tituloAlvo });
    },
    [navigation],
  );

  /** Fase 25 — `onDenunciar` de `ComentarioItem` já pré-fixando `"comentario"`, estável. */
  const denunciarComentario = useCallback(
    (comentarioId: string, nomeAutor?: string) => denunciar("comentario", comentarioId, nomeAutor),
    [denunciar],
  );

  async function alternarCurtida() {
    if (curtindo || !postagem) return;
    setCurtindo(true);
    try {
      const { curtido, totalCurtidas } = await FeedService.alternarCurtida(postagem.id);
      setPostagem((atual) => (atual ? { ...atual, curtidoPorMim: curtido, totalCurtidas } : atual));
    } catch {
      // Sem optimistic update (decisão desta fase): erro silencioso, o botão só volta a ficar habilitado — mesma decisão de `HomeScreen.tsx`.
    } finally {
      setCurtindo(false);
    }
  }

  async function comentar() {
    if (enviandoComentario || novoComentario.trim().length === 0) return;
    setEnviandoComentario(true);
    setErroComentar(null);
    try {
      const criado = await FeedService.criarComentario(postagemId, novoComentario.trim());
      setComentarios((atual) => [...atual, criado]);
      setNovoComentario("");
    } catch (erroRequisicao) {
      setErroComentar(getFriendlyErrorMessage(erroRequisicao, "Não foi possível comentar agora."));
    } finally {
      setEnviandoComentario(false);
    }
  }

  // Fase 25 — estável, para `ComentarioItem` memoizado. Qual comentário tem a
  // caixa de resposta aberta é decidido por `respondendoAEste` (uma prop
  // booleana por item), não por trocar este handler.
  const iniciarResposta = useCallback((comentarioId: string) => {
    setRespondendoA(comentarioId);
    setTextoResposta("");
    setErroResponder(null);
  }, []);

  function cancelarResposta() {
    setRespondendoA(null);
    setTextoResposta("");
    setErroResponder(null);
  }

  async function enviarResposta() {
    if (enviandoResposta || !respondendoA || textoResposta.trim().length === 0) return;
    setEnviandoResposta(true);
    setErroResponder(null);
    try {
      const criado = await FeedService.criarComentario(postagemId, textoResposta.trim(), respondendoA);
      setComentarios((atual) =>
        atual.map((comentario) =>
          comentario.id === respondendoA
            ? { ...comentario, respostas: [...(comentario.respostas ?? []), criado] }
            : comentario,
        ),
      );
      setRespondendoA(null);
      setTextoResposta("");
    } catch (erroRequisicao) {
      setErroResponder(getFriendlyErrorMessage(erroRequisicao, "Não foi possível responder agora."));
    } finally {
      setEnviandoResposta(false);
    }
  }

  const excluirComentario = useCallback(
    async (comentarioId: string) => {
      if (excluindoComentarioRef.current) return;
      excluindoComentarioRef.current = true;
      setExcluindoComentarioId(comentarioId);
      setErroExcluirComentario(null);
      try {
        await FeedService.removerComentario(comentarioId);
        removerComentarioDoEstado(comentarioId);
        // Lista PERSISTE (a tela não desmonta) — o contador tem
        // `accessibilityLiveRegion="polite"` e já anuncia a mudança sozinho,
        // mesma distinção de `comentar()`/`enviarResposta()`.
      } catch (erroRequisicao) {
        setErroExcluirComentario(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir o comentário agora."));
      } finally {
        excluindoComentarioRef.current = false;
        setExcluindoComentarioId(null);
      }
    },
    [removerComentarioDoEstado],
  );

  const confirmarExclusaoComentario = useCallback(
    (comentarioId: string) => {
      if (excluindoComentarioRef.current) return; // uma exclusão de comentário por vez.
      confirmarExclusao("Excluir comentário", "Esta ação não pode ser desfeita.", () => void excluirComentario(comentarioId));
    },
    [excluirComentario],
  );

  function iniciarEdicaoPostagem() {
    if (!postagem) return;
    setTextoEdicao(postagem.conteudo ?? "");
    setErroEdicao(null);
    setEditandoPostagem(true);
  }

  function cancelarEdicaoPostagem() {
    setEditandoPostagem(false);
    setErroEdicao(null);
  }

  async function salvarEdicaoPostagem() {
    if (salvandoEdicao || textoEdicao.trim().length === 0) return;
    setSalvandoEdicao(true);
    setErroEdicao(null);
    try {
      const atualizada = await FeedService.atualizar(postagemId, { conteudo: textoEdicao.trim() });
      setPostagem(atualizada);
      setEditandoPostagem(false);
      // A tela não desmonta (o conteúdo só troca dentro da mesma árvore) —
      // caso de `accessibilityLiveRegion`, não `announceForAccessibility`
      // (mesma distinção documentada em `NovaPostagemScreen.tsx` para o
      // caso INVERSO, de subárvore que desmonta).
    } catch (erroRequisicao) {
      setErroEdicao(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar a edição agora."));
    } finally {
      setSalvandoEdicao(false);
    }
  }

  function confirmarExclusaoPostagem() {
    confirmarExclusao(
      "Excluir publicação",
      "Esta ação não pode ser desfeita.",
      () => void excluirPostagem(),
    );
  }

  async function excluirPostagem() {
    if (excluindo) return;
    setExcluindo(true);
    setErroExcluir(null);
    try {
      await FeedService.remover(postagemId);
      announceForAccessibility("Publicação removida.");
      navigation.goBack();
    } catch (erroRequisicao) {
      setErroExcluir(getFriendlyErrorMessage(erroRequisicao, "Não foi possível excluir a publicação agora."));
      setExcluindo(false);
    }
  }

  async function salvarDescricaoAnexo(anexoId: string, descricao: string) {
    const atualizada = await FeedService.atualizarDescricaoAnexo(postagemId, anexoId, descricao.trim() || null);
    setPostagem(atualizada);
  }

  if (carregandoPostagem) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erroPostagem && !postagem) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar esta publicação
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erroPostagem}</Text>
            <Button onPress={tentarNovamentePostagem}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  // Nunca deveria acontecer (as duas condições acima cobrem loading/erro), mas satisfaz o TypeScript sem `!`.
  if (!postagem) return null;

  const autor = postagem.usuario ?? postagem.autor;
  const ehMinhaPostagem = Boolean(autor?.id) && autor?.id === user?.id;
  const dataFormatada = formatarData(postagem.created_at);
  const totalComentariosAtual = comentarios.reduce(
    (acumulado, comentario) => acumulado + 1 + (comentario.respostas?.length ?? 0),
    0,
  );

  // Texto lido pelo botão "Ouvir em voz alta" (Fase 21) — o texto da
  // publicação seguido da descrição acessível de cada anexo, na mesma
  // ordem em que aparecem na tela (a descrição de imagem já é conteúdo
  // real, não decorativo — faz sentido fazer parte da leitura contínua).
  const textoParaLeitura = [postagem.conteudo, ...(postagem.anexos ?? []).map((anexo) => anexo.descricao).filter(Boolean)]
    .filter(Boolean)
    .join(" ");

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
        {removidaRemotamente ? (
          <Card
            elevation="sm"
            style={{ gap: theme.spacing.xs, backgroundColor: theme.colors.warning.soft }}
            accessibilityLiveRegion="polite"
          >
            <Text
              accessibilityRole="alert"
              style={[theme.typography.body, { color: theme.colors.warning.onSoft }]}
            >
              Esta publicação foi removida e não está mais disponível.
            </Text>
            <Button variant="outline" size="small" onPress={() => navigation.goBack()}>
              Voltar
            </Button>
          </Card>
        ) : null}

        <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Pressable
              onPress={() => autor?.id && abrirPerfil(autor.id)}
              disabled={!autor?.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${autor?.nome ?? "Usuário do ACESSO"}`}
              style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, flex: 1 }}
            >
              <Avatar nome={autor?.nome} theme={theme} />
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
                  {autor?.nome ?? "Usuário do ACESSO"}
                </Text>
                {dataFormatada ? (
                  <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                    {dataFormatada}
                    {postagem.editadoEm ? " · editado" : ""}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>

          {editandoPostagem ? (
            <View style={{ gap: theme.spacing.xs }}>
              <Input
                label="Texto da publicação"
                value={textoEdicao}
                onChangeText={setTextoEdicao}
                multiline
                editable={!salvandoEdicao}
                error={erroEdicao ?? undefined}
              />
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Button
                  size="small"
                  onPress={() => void salvarEdicaoPostagem()}
                  loading={salvandoEdicao}
                  disabled={salvandoEdicao || textoEdicao.trim().length === 0}
                >
                  Salvar
                </Button>
                <Button variant="ghost" size="small" onPress={cancelarEdicaoPostagem} disabled={salvandoEdicao}>
                  Cancelar
                </Button>
              </View>
            </View>
          ) : (
            <>
              {postagem.conteudo ? (
                <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]}>{postagem.conteudo}</Text>
              ) : null}

              {(postagem.anexos ?? []).map((anexo) => (
                <AnexoImagem
                  key={anexo.id}
                  anexo={anexo}
                  postagemId={postagem.id}
                  theme={theme}
                  podeEditarDescricao={ehMinhaPostagem}
                  onAmpliar={() => setAnexoAmpliado(anexo)}
                  onSalvarDescricao={(descricao) => salvarDescricaoAnexo(anexo.id, descricao)}
                />
              ))}

              <SpeechButton texto={textoParaLeitura} rotulo="esta publicação" />
            </>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => void alternarCurtida()}
              disabled={curtindo || removidaRemotamente}
              accessibilityRole="button"
              accessibilityLabel={postagem.curtidoPorMim ? "Descurtir" : "Curtir"}
              accessibilityState={{ selected: postagem.curtidoPorMim, disabled: curtindo }}
              hitSlop={10}
              style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center" }}
            >
              <Text
                style={[
                  theme.typography.bodySmall,
                  { color: postagem.curtidoPorMim ? theme.colors.primary.solid : theme.colors.textSecondary },
                ]}
              >
                {postagem.curtidoPorMim ? "Curtido" : "Curtir"}
                {postagem.totalCurtidas > 0 ? ` · ${postagem.totalCurtidas}` : ""}
              </Text>
            </Pressable>
            {!ehMinhaPostagem ? (
              <Pressable
                onPress={() => denunciar("postagem", postagem.id, autor?.nome)}
                accessibilityRole="button"
                accessibilityLabel="Denunciar publicação"
                hitSlop={10}
                style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center" }}
              >
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>Denunciar</Text>
              </Pressable>
            ) : !editandoPostagem ? (
              <>
                <Pressable
                  onPress={iniciarEdicaoPostagem}
                  disabled={removidaRemotamente}
                  accessibilityRole="button"
                  accessibilityLabel="Editar publicação"
                  hitSlop={10}
                  style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center" }}
                >
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={confirmarExclusaoPostagem}
                  disabled={excluindo || removidaRemotamente}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir publicação"
                  accessibilityState={{ disabled: excluindo }}
                  hitSlop={10}
                  style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center" }}
                >
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.error.solid }]}>
                    {excluindo ? "Excluindo…" : "Excluir"}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
          {erroExcluir ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.caption, { color: theme.colors.error.solid }]}
            >
              {erroExcluir}
            </Text>
          ) : null}
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <Text
            // Contador MUDANDO numa lista que persiste (a tela não desmonta ao comentar) — caso de liveRegion, não announceForAccessibility (mesma política de `JobsScreen.tsx`).
            accessibilityLiveRegion="polite"
            style={[theme.typography.title, { color: theme.colors.textPrimary }]}
          >
            {`Comentários (${totalComentariosAtual})`}
          </Text>

          {erroExcluirComentario ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.caption, { color: theme.colors.error.solid }]}
            >
              {erroExcluirComentario}
            </Text>
          ) : null}

          {carregandoComentarios ? (
            <ActivityIndicator color={theme.colors.primary.solid} />
          ) : erroComentarios && comentarios.length === 0 ? (
            <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[theme.typography.bodySmall, { color: theme.colors.error.solid }]}
              >
                {erroComentarios}
              </Text>
              <Button variant="outline" size="small" onPress={tentarNovamenteComentarios}>
                Tentar novamente
              </Button>
            </Card>
          ) : comentarios.length === 0 ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
              Nenhum comentário ainda. Seja a primeira pessoa a comentar.
            </Text>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {comentarios.map((comentario, indice) => (
                <View key={comentario.id} style={{ gap: theme.spacing.sm }}>
                  {indice > 0 ? <Divider /> : null}
                  {/* Fase 25 (performance): todos os handlers passados DIRETO (estáveis
                      por `useCallback`) — o item chama cada um com o id/objeto que
                      precisa. "Responder" só nos comentários de nível raiz (`onResponder`
                      não vai para as respostas — 1 nível, Fase 10); qual comentário tem
                      a caixa de resposta aberta agora é uma prop booleana (`respondendoAEste`),
                      não uma troca de handler. Ver `HomeScreen.tsx`. */}
                  <ComentarioItem
                    comentario={comentario}
                    theme={theme}
                    meuUsuarioId={user?.id}
                    onResponder={iniciarResposta}
                    respondendoAEste={respondendoA === comentario.id}
                    onAbrirPerfil={abrirPerfil}
                    onDenunciar={denunciarComentario}
                    onExcluir={confirmarExclusaoComentario}
                    excluindo={excluindoComentarioId === comentario.id}
                  />
                  {comentario.respostas && comentario.respostas.length > 0 ? (
                    <View style={{ gap: theme.spacing.sm, paddingLeft: theme.spacing.lg }}>
                      {comentario.respostas.map((resposta) => (
                        <ComentarioItem
                          key={resposta.id}
                          comentario={resposta}
                          theme={theme}
                          meuUsuarioId={user?.id}
                          onAbrirPerfil={abrirPerfil}
                          onDenunciar={denunciarComentario}
                          onExcluir={confirmarExclusaoComentario}
                          excluindo={excluindoComentarioId === resposta.id}
                        />
                      ))}
                    </View>
                  ) : null}

                  {respondendoA === comentario.id ? (
                    <View style={{ gap: theme.spacing.xs, paddingLeft: theme.spacing.lg }}>
                      <Input
                        label={`Responder a ${comentario.usuario?.nome ?? comentario.autor?.nome ?? "este comentário"}`}
                        value={textoResposta}
                        onChangeText={setTextoResposta}
                        editable={!enviandoResposta}
                        error={erroResponder ?? undefined}
                      />
                      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                        <Button
                          size="small"
                          onPress={() => void enviarResposta()}
                          loading={enviandoResposta}
                          disabled={enviandoResposta || textoResposta.trim().length === 0}
                        >
                          Enviar resposta
                        </Button>
                        <Button variant="ghost" size="small" onPress={cancelarResposta} disabled={enviandoResposta}>
                          Cancelar
                        </Button>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
          <Input
            label="Adicionar um comentário"
            value={novoComentario}
            onChangeText={setNovoComentario}
            editable={!enviandoComentario && !removidaRemotamente}
            error={erroComentar ?? undefined}
          />
          <Button
            size="small"
            onPress={() => void comentar()}
            loading={enviandoComentario}
            disabled={enviandoComentario || novoComentario.trim().length === 0 || removidaRemotamente}
          >
            Comentar
          </Button>
        </Card>
      </ScrollView>

      <Modal
        visible={anexoAmpliado !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnexoAmpliado(null)}
      >
        {/* Cores fixas de propósito (não `theme.colors.*`): o fundo do
            lightbox é sempre um véu escuro, claro ou escuro que seja o tema
            do app — mesmo tipo de exceção já aceita em `Button.tsx`
            (`ripple: "rgba(255,255,255,0.25)"`), nunca um oversight. Sem
            problema de contraste (branco sobre preto quase opaco). */}
        <Pressable
          onPress={() => setAnexoAmpliado(null)}
          accessibilityRole="button"
          accessibilityLabel="Fechar imagem ampliada"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center" }}
        >
          {anexoAmpliado ? (
            <Image
              // `cacheKey` no `id` do anexo (Fase 25) — mesma razão do
              // resumo no feed (`HomeScreen.tsx`): a URL assinada muda a
              // cada busca, o `id` não.
              source={{ uri: anexoAmpliado.url, cacheKey: anexoAmpliado.id }}
              accessible
              accessibilityLabel={anexoAmpliado.descricao || "Imagem ampliada, sem descrição informada."}
              contentFit="contain"
              style={{ width: "100%", height: "80%" }}
            />
          ) : null}
          {anexoAmpliado?.descricao ? (
            <Text style={[theme.typography.bodySmall, { color: "#fff", textAlign: "center", padding: theme.spacing.md }]}>
              {anexoAmpliado.descricao}
            </Text>
          ) : null}
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

/** Mesmo círculo com iniciais de `HomeScreen.tsx` — local a este arquivo pelo mesmo motivo (`src/feed/` sem componente/util compartilhado). */
function Avatar({ nome, theme }: { nome: string | undefined; theme: Theme }) {
  return (
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
      <Text style={[theme.typography.label, { color: theme.colors.primary.onSoft }]}>{iniciaisDoNome(nome)}</Text>
    </View>
  );
}

/**
 * Um anexo de imagem no detalhe (Fase 20) — a peça central de acessibilidade
 * desta fase: SEMPRE tem `accessibilityLabel` (a descrição real, ou um aviso
 * honesto de que não há descrição — nunca omitida), abre em tela cheia ao
 * tocar, e se renovar a URL sozinha UMA VEZ se a assinatura expirar
 * (`onError`) — `postagem.anexos[].url` já vem pronta da API (Fase 7:
 * `assinarMidiaDasPostagens`), mas tem TTL curto para autor de perfil
 * privado (ver `env.storage.signedUrlExpiresSeconds`, backend); sem este
 * fallback, uma sessão longa no detalhe acabaria mostrando uma imagem
 * quebrada sem nenhum jeito de recuperar sem recarregar a tela inteira.
 */
function AnexoImagem({
  anexo,
  postagemId,
  theme,
  podeEditarDescricao,
  onAmpliar,
  onSalvarDescricao,
}: {
  anexo: PostagemAnexo;
  postagemId: string;
  theme: Theme;
  podeEditarDescricao: boolean;
  onAmpliar: () => void;
  onSalvarDescricao: (descricao: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(anexo.url);
  const [jaRenovou, setJaRenovou] = useState(false);
  // `anexo.url` pode mudar entre renderizações SEM o componente remontar
  // (mesmo `id`, `key` igual): a assinatura é regerada a cada resposta do
  // backend (editar a descrição, ou o refetch de `feed:postagem`
  // `atualizada` em tempo real). Reseta o estado local DURANTE a
  // renderização (comparando com o último `anexo.url` visto), não num
  // `useEffect` — é o padrão recomendado pelo próprio React para "ajustar
  // estado quando uma prop muda", e evita o cascading-render que um
  // `setState` dentro de efeito causaria aqui.
  const [ultimoUrlVisto, setUltimoUrlVisto] = useState(anexo.url);
  if (ultimoUrlVisto !== anexo.url) {
    setUltimoUrlVisto(anexo.url);
    setUrl(anexo.url);
    setJaRenovou(false);
  }
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(anexo.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoFalharCarregamento() {
    if (jaRenovou) return; // só tenta renovar uma vez — evita loop se o problema for outro (rede, arquivo removido do bucket).
    setJaRenovou(true);
    try {
      const renovado = await FeedService.obterUrlAnexo(postagemId, anexo.id);
      setUrl(renovado.url);
    } catch {
      // Sem fallback além disso — a imagem só continua não carregando,
      // sem travar o resto da tela.
    }
  }

  function iniciarEdicao() {
    setTexto(anexo.descricao ?? "");
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await onSalvarDescricao(texto);
      setEditando(false);
    } catch (erroRequisicao) {
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível salvar a descrição agora."));
    } finally {
      setSalvando(false);
    }
  }

  if (anexo.tipo !== "imagem") {
    return (
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
        {anexo.tipo === "video" ? "Vídeo anexado (sem player nesta versão do app)." : "Arquivo anexado."}
      </Text>
    );
  }

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Pressable onPress={onAmpliar} accessibilityRole="button" accessibilityLabel="Ver imagem ampliada">
        <Image
          // `cacheKey` no `id` do anexo (Fase 25), nunca na `url` (que muda
          // a cada nova assinatura — inclusive quando `aoFalharCarregamento`
          // troca `url` por uma renovada, o `id` continua sendo o mesmo
          // arquivo lógico).
          source={{ uri: url, cacheKey: anexo.id }}
          onError={() => void aoFalharCarregamento()}
          accessible
          accessibilityLabel={anexo.descricao || "Imagem anexada à publicação, sem descrição informada."}
          contentFit="cover"
          style={{ width: "100%", height: 220, borderRadius: theme.radius.md, backgroundColor: theme.colors.divider }}
        />
      </Pressable>

      {editando ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Input
            label="Descrição da imagem"
            value={texto}
            onChangeText={setTexto}
            multiline
            editable={!salvando}
            error={erro ?? undefined}
            helperText="Lida em voz alta por leitores de tela."
          />
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Button size="small" onPress={() => void salvar()} loading={salvando} disabled={salvando}>
              Salvar
            </Button>
            <Button variant="ghost" size="small" onPress={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted, flex: 1 }]}>
            {anexo.descricao || "Sem descrição."}
          </Text>
          {podeEditarDescricao ? (
            <Pressable
              onPress={iniciarEdicao}
              accessibilityRole="button"
              accessibilityLabel="Editar descrição da imagem"
              hitSlop={8}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.primary.solid, fontWeight: "700" }]}>
                Editar
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * Função local, não exportada — só esta tela consome. `onResponder` não é
 * passada para as respostas (1 nível — Fase 10); qual comentário está sendo
 * respondido AGORA vem em `respondendoAEste`, não numa troca de handler.
 * `onExcluir` só tem efeito nos comentários do próprio usuário (a UI nem
 * mostra a ação nos demais).
 *
 * `React.memo` (Fase 25, performance) — todos os handlers são estáveis
 * (`useCallback` no pai) e recebem o id/objeto como parâmetro, então
 * comentar/responder/excluir UM comentário não reprocessa os outros. Ver
 * `HomeScreen.tsx`.
 */
const ComentarioItem = memo(function ComentarioItem({
  comentario,
  theme,
  meuUsuarioId,
  onResponder,
  respondendoAEste = false,
  onAbrirPerfil,
  onDenunciar,
  onExcluir,
  excluindo = false,
}: {
  comentario: Comentario;
  theme: Theme;
  meuUsuarioId: string | undefined;
  onResponder?: (comentarioId: string) => void;
  respondendoAEste?: boolean;
  onAbrirPerfil: (usuarioId: string) => void;
  onDenunciar: (comentarioId: string, nomeAutor?: string) => void;
  onExcluir?: (comentarioId: string) => void;
  excluindo?: boolean;
}) {
  const autor = comentario.usuario ?? comentario.autor;
  const ehMeuComentario = Boolean(autor?.id) && autor?.id === meuUsuarioId;
  const dataFormatada = formatarData(comentario.created_at);

  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
      {/* Um só alvo de toque (avatar) para abrir o perfil — evita dois
          elementos com rótulo diferente para a mesma ação (o nome, junto do
          resto do comentário, não é tocável em separado). */}
      <Pressable
        onPress={() => autor?.id && onAbrirPerfil(autor.id)}
        disabled={!autor?.id}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${autor?.nome ?? "Usuário do ACESSO"}`}
      >
        <Avatar nome={autor?.nome} theme={theme} />
      </Pressable>
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
          {autor?.nome ?? "Usuário do ACESSO"}
        </Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textPrimary }]}>{comentario.comentario}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          {dataFormatada ? (
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{dataFormatada}</Text>
          ) : null}
          {/* Enquanto a caixa de resposta DESTE comentário já está aberta, o botão
              "Responder" some (evita duas ações com o mesmo rótulo lidas pelo TalkBack
              ao mesmo tempo). */}
          {onResponder && !respondendoAEste ? (
            <Pressable
              onPress={() => onResponder(comentario.id)}
              accessibilityRole="button"
              accessibilityLabel={`Responder a ${autor?.nome ?? "este comentário"}`}
              hitSlop={8}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.primary.solid, fontWeight: "700" }]}>
                Responder
              </Text>
            </Pressable>
          ) : null}
          {!ehMeuComentario ? (
            <Pressable
              onPress={() => onDenunciar(comentario.id, autor?.nome)}
              accessibilityRole="button"
              accessibilityLabel={`Denunciar comentário de ${autor?.nome ?? "este usuário"}`}
              hitSlop={8}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Denunciar</Text>
            </Pressable>
          ) : null}
          {ehMeuComentario && onExcluir ? (
            <Pressable
              onPress={() => onExcluir(comentario.id)}
              disabled={excluindo}
              accessibilityRole="button"
              accessibilityLabel="Excluir meu comentário"
              accessibilityState={{ disabled: excluindo }}
              hitSlop={8}
            >
              <Text style={[theme.typography.caption, { color: theme.colors.error.solid, fontWeight: "700" }]}>
                {excluindo ? "Excluindo…" : "Excluir"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});
