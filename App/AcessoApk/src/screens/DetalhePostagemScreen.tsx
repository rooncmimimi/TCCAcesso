import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { anunciarParaLeitorDeTela } from "../acessibilidade";
import { useAutenticacao } from "../autenticacao";
import {
  Avatar,
  Botao,
  Cartao,
  Divisor,
  EstadoErro,
  CampoTexto,
  EstadoCarregamento,
  ContainerTela,
  BotaoOuvir,
} from "../components/ui";
import { FeedService } from "../feed";
import type {
  Comentario,
  FeedComentarioEvento,
  FeedCurtidaEvento,
  FeedPostagemEvento,
  Postagem,
  PostagemAnexo,
} from "../feed";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { ouvirEvento } from "../services/socket/socketClient";
import { useTema } from "../tema";
import { formatarDataPorExtenso } from "../utils/formatacao";
import { confirmarExclusao } from "../utils/confirmarExclusao";
import { AnexoImagem } from "./detalhePostagem/AnexoImagem";
import { ComentarioItem } from "./detalhePostagem/ComentarioItem";

const LIMITE_COMENTARIOS = 50;

type PostagemDetailScreenProps = NativeStackScreenProps<AppStackParamList, "PostagemDetail">;

/**
 * Detalhe de uma publicação, com anexos, comentários e atualizações em tempo real. Publicação e
 * comentários carregam de forma independente, cada um com seu carregamento e erro: se só os
 * comentários falharem, a publicação continua visível e a nova tentativa fica restrita à seção de
 * comentários.
 */
export function DetalhePostagemScreen({ route, navigation }: PostagemDetailScreenProps) {
  const { postagemId } = route.params;
  const { tema } = useTema();
  const { usuario } = useAutenticacao();

  const [postagem, setPostagem] = useState<Postagem | null>(null);
  const [erroPostagem, setErroPostagem] = useState<string | null>(null);
  const [carregandoPostagem, setCarregandoPostagem] = useState(true);
  const [tentativaPostagem, setTentativaPostagem] = useState(0);
  const [curtindo, setCurtindo] = useState(false);
  // A publicação foi removida (por outro aparelho ou pela moderação) enquanto estava aberta. A tela
  // não volta sozinha, para não surpreender quem está no meio da leitura com leitor de tela: só
  // avisa e desabilita as ações que dependem dela.
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

  // Exclusão do próprio comentário ou resposta (não há edição). `excluindoComentarioId` só alimenta
  // o rótulo "Excluindo…"; a trava de uma exclusão por vez usa uma ref, para não recriar os
  // handlers memoizados a cada exclusão.
  const [excluindoComentarioId, setExcluindoComentarioId] = useState<string | null>(null);
  const [erroExcluirComentario, setErroExcluirComentario] = useState<string | null>(null);
  const excluindoComentarioRef = useRef(false);

  // Edição e exclusão da própria publicação; a edição muda só o texto (ver
  // `FeedService.atualizar`).
  const [editandoPostagem, setEditandoPostagem] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  // Anexo aberto em tela cheia, com `Modal` e `Image` nativos (uma imagem por vez, sem gesto de
  // pinça).
  const [anexoAmpliado, setAnexoAmpliado] = useState<PostagemAnexo | null>(null);

  // Busca da publicação: função inline dentro do próprio efeito (mesmo
  // padrão de `AutenticacaoProvider.tsx`/`DetalheVagaScreen.tsx`), evita o lint
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
        setErroPostagem(extrairMensagemErro(erroRequisicao, "Não foi possível carregar esta publicação."));
      } finally {
        if (!cancelado) setCarregandoPostagem(false);
      }
    }

    void carregarPostagem();
    return () => {
      cancelado = true;
    };
  }, [postagemId, tentativaPostagem]);

  // Busca dos comentários; efeito próprio e independente do de cima: as
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
        setErroComentarios(extrairMensagemErro(erroRequisicao, "Não foi possível carregar os comentários."));
      } finally {
        if (!cancelado) setCarregandoComentarios(false);
      }
    }

    void carregarComentarios();
    return () => {
      cancelado = true;
    };
  }, [postagemId, tentativaComentarios]);

  /**
   * Tira um comentário ou resposta da lista local pelo `id`, tanto na exclusão feita aqui quanto no
   * evento `feed:comentario` com `removido`. Rodar duas vezes com o mesmo `id` (a exclusão e o eco
   * do socket) não tem efeito colateral.
   */
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

  // Tempo real restrito a esta publicação, diferente do `FeedScreen.tsx`, que não sabe de antemão
  // quais publicações estão na tela.
  //
  // - curtidas: a contagem vem no payload e é aplicada direto;
  // - comentário novo: o payload não diz qual comentário surgiu, então a lista é recarregada em
  //   silêncio;
  // - comentário removido: vem com `comentarioId` e é só filtrado da lista;
  // - publicação atualizada: recarregada pela API; removida: vira um aviso, sem voltar de tela.
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

      // Comentário de outra pessoa: sem `comentarioId` no payload não dá para inserir só ele, então
      // a lista inteira é recarregada em silêncio, como em `MensagensScreen.tsx`.
      FeedService.listarComentarios(postagemId, { page: 1, limit: LIMITE_COMENTARIOS })
        .then((resposta) => setComentarios(resposta.comentarios))
        .catch(() => {
          // Falha aqui não é crítica: a lista só continua com o que já
          // tinha carregado (mesma filosofia de falhas silenciosas de
          // tempo real já usada em `FeedScreen.tsx`).
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

  /**
   * Abre o perfil público do autor da publicação ou de um comentário. Usa `useCallback` para o
   * `memo` de `ComentarioItem` funcionar.
   */
  const abrirPerfil = useCallback(
    (usuarioId: string) => {
      navigation.navigate("PublicProfile", { usuarioId });
    },
    [navigation],
  );

  /** Serve para denunciar a publicação ou um comentário, sem duplicar a navegação. */
  const denunciar = useCallback(
    (entidadeTipo: "postagem" | "comentario", entidadeId: string, tituloAlvo?: string) => {
      navigation.navigate("Report", { entidadeTipo, entidadeId, tituloAlvo });
    },
    [navigation],
  );

  /** `onDenunciar` estável para o `ComentarioItem`, já com o tipo `"comentario"`. */
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
      // Sem atualização otimista: se falhar, nada muda e o botão só volta a ficar habilitado, como
      // no `FeedScreen.tsx`.
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
      setErroComentar(extrairMensagemErro(erroRequisicao, "Não foi possível comentar agora."));
    } finally {
      setEnviandoComentario(false);
    }
  }

  // Estável, para o `ComentarioItem` memoizado. Qual comentário está com a caixa de resposta aberta
  // é decidido pela prop `respondendoAEste`, não pela troca deste handler.
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
      setErroResponder(extrairMensagemErro(erroRequisicao, "Não foi possível responder agora."));
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
        // Lista persiste (a tela não desmonta): o contador tem
        // `accessibilityLiveRegion="polite"` e já anuncia a mudança sozinho,
        // mesma distinção de `comentar()`/`enviarResposta()`.
      } catch (erroRequisicao) {
        setErroExcluirComentario(extrairMensagemErro(erroRequisicao, "Não foi possível excluir o comentário agora."));
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
      // A tela continua montada e só o conteúdo muda, então basta `accessibilityLiveRegion`, sem
      // `anunciarParaLeitorDeTela` (o caso contrário, de tela que fecha, está em
      // `NovaPostagemScreen.tsx`).
    } catch (erroRequisicao) {
      setErroEdicao(extrairMensagemErro(erroRequisicao, "Não foi possível salvar a edição agora."));
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
      anunciarParaLeitorDeTela("Publicação removida.");
      navigation.goBack();
    } catch (erroRequisicao) {
      setErroExcluir(extrairMensagemErro(erroRequisicao, "Não foi possível excluir a publicação agora."));
      setExcluindo(false);
    }
  }

  async function salvarDescricaoAnexo(anexoId: string, descricao: string) {
    const atualizada = await FeedService.atualizarDescricaoAnexo(postagemId, anexoId, descricao.trim() || null);
    setPostagem(atualizada);
  }

  if (carregandoPostagem) {
    return <EstadoCarregamento />;
  }

  if (erroPostagem && !postagem) {
    return (
      <EstadoErro titulo="Não foi possível carregar esta publicação" mensagem={erroPostagem} onTentarNovamente={tentarNovamentePostagem} />
    );
  }

  // Nunca deveria acontecer (as duas condições acima cobrem loading/erro), mas satisfaz o TypeScript sem `!`.
  if (!postagem) return null;

  const autor = postagem.usuario ?? postagem.autor;
  const ehMinhaPostagem = Boolean(autor?.id) && autor?.id === usuario?.id;
  const dataFormatada = formatarDataPorExtenso(postagem.criadoEm);
  const totalComentariosAtual = comentarios.reduce(
    (acumulado, comentario) => acumulado + 1 + (comentario.respostas?.length ?? 0),
    0,
  );

  // Texto do botão "Ouvir em voz alta": o conteúdo da publicação seguido da descrição de cada
  // anexo, na ordem da tela. A descrição da imagem é conteúdo real, então entra na leitura
  // contínua.
  const textoParaLeitura = [postagem.conteudo, ...(postagem.anexos ?? []).map((anexo) => anexo.descricao).filter(Boolean)]
    .filter(Boolean)
    .join(" ");

  return (
    <ContainerTela>
      <ScrollView contentContainerStyle={{ gap: tema.spacing.md, paddingVertical: tema.spacing.md }}>
        {removidaRemotamente ? (
          <Cartao
            elevacao="sm"
            style={{ gap: tema.spacing.xs, backgroundColor: tema.colors.warning.soft }}
            accessibilityLiveRegion="polite"
          >
            <Text
              accessibilityRole="alert"
              style={[tema.typography.body, { color: tema.colors.warning.onSoft }]}
            >
              Esta publicação foi removida e não está mais disponível.
            </Text>
            <Botao variant="outline" size="small" onPress={() => navigation.goBack()}>
              Voltar
            </Botao>
          </Cartao>
        ) : null}

        <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
            <Pressable
              onPress={() => autor?.id && abrirPerfil(autor.id)}
              disabled={!autor?.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${autor?.nome ?? "Usuário do ACESSO"}`}
              style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm, flex: 1 }}
              // Avatar de 40dp: 4 de cada lado leva a área de toque a 48dp.
              hitSlop={4}
            >
              <Avatar nome={autor?.nome} fotoUrl={autor?.fotoPerfil} size="medium" />
              <View style={{ flex: 1 }}>
                <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
                  {autor?.nome ?? "Usuário do ACESSO"}
                </Text>
                {dataFormatada ? (
                  <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                    {dataFormatada}
                    {postagem.editadoEm ? " · editado" : ""}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>

          {editandoPostagem ? (
            <View style={{ gap: tema.spacing.xs }}>
              <CampoTexto
                rotulo="Texto da publicação"
                value={textoEdicao}
                onChangeText={setTextoEdicao}
                multiline
                editable={!salvandoEdicao}
                erro={erroEdicao ?? undefined}
              />
              <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
                <Botao
                  size="small"
                  onPress={() => void salvarEdicaoPostagem()}
                  carregando={salvandoEdicao}
                  disabled={salvandoEdicao || textoEdicao.trim().length === 0}
                >
                  Salvar
                </Botao>
                <Botao variant="ghost" size="small" onPress={cancelarEdicaoPostagem} disabled={salvandoEdicao}>
                  Cancelar
                </Botao>
              </View>
            </View>
          ) : (
            <>
              {postagem.conteudo ? (
                <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]}>{postagem.conteudo}</Text>
              ) : null}

              {(postagem.anexos ?? []).map((anexo) => (
                <AnexoImagem
                  key={anexo.id}
                  anexo={anexo}
                  postagemId={postagem.id}
                  tema={tema}
                  podeEditarDescricao={ehMinhaPostagem}
                  onAmpliar={() => setAnexoAmpliado(anexo)}
                  onSalvarDescricao={(descricao) => salvarDescricaoAnexo(anexo.id, descricao)}
                />
              ))}

              <BotaoOuvir texto={textoParaLeitura} rotulo="esta publicação" />
            </>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.md, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => void alternarCurtida()}
              disabled={curtindo || removidaRemotamente}
              accessibilityRole="button"
              accessibilityLabel={postagem.curtidoPorMim ? "Descurtir" : "Curtir"}
              accessibilityState={{ selected: postagem.curtidoPorMim, disabled: curtindo }}
              hitSlop={10}
              style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center" }}
            >
              <Text
                style={[
                  tema.typography.bodySmall,
                  { color: postagem.curtidoPorMim ? tema.colors.primary.solid : tema.colors.textSecondary },
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
                style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center" }}
              >
                <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>Denunciar</Text>
              </Pressable>
            ) : !editandoPostagem ? (
              <>
                <Pressable
                  onPress={iniciarEdicaoPostagem}
                  disabled={removidaRemotamente}
                  accessibilityRole="button"
                  accessibilityLabel="Editar publicação"
                  hitSlop={10}
                  style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center" }}
                >
                  <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={confirmarExclusaoPostagem}
                  disabled={excluindo || removidaRemotamente}
                  accessibilityRole="button"
                  accessibilityLabel="Excluir publicação"
                  accessibilityState={{ disabled: excluindo }}
                  hitSlop={10}
                  style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center" }}
                >
                  <Text style={[tema.typography.bodySmall, { color: tema.colors.error.solid }]}>
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
              style={[tema.typography.caption, { color: tema.colors.error.solid }]}
            >
              {erroExcluir}
            </Text>
          ) : null}
        </Cartao>

        <View style={{ gap: tema.spacing.sm }}>
          <Text
            // Contador mudando numa lista que persiste (a tela não desmonta ao comentar): caso de liveRegion, não anunciarParaLeitorDeTela (mesma política de `VagasScreen.tsx`).
            accessibilityLiveRegion="polite"
            style={[tema.typography.title, { color: tema.colors.textPrimary }]}
          >
            {`Comentários (${totalComentariosAtual})`}
          </Text>

          {erroExcluirComentario ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[tema.typography.caption, { color: tema.colors.error.solid }]}
            >
              {erroExcluirComentario}
            </Text>
          ) : null}

          {carregandoComentarios ? (
            <ActivityIndicator color={tema.colors.primary.solid} />
          ) : erroComentarios && comentarios.length === 0 ? (
            <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[tema.typography.bodySmall, { color: tema.colors.error.solid }]}
              >
                {erroComentarios}
              </Text>
              <Botao variant="outline" size="small" onPress={tentarNovamenteComentarios}>
                Tentar novamente
              </Botao>
            </Cartao>
          ) : comentarios.length === 0 ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
              Nenhum comentário ainda. Seja a primeira pessoa a comentar.
            </Text>
          ) : (
            <View style={{ gap: tema.spacing.sm }}>
              {comentarios.map((comentario, indice) => (
                <View key={comentario.id} style={{ gap: tema.spacing.sm }}>
                  {indice > 0 ? <Divisor /> : null}
                  {/* Todos os handlers são passados direto (estáveis por `useCallback`), e o
                      item chama cada um com o id ou objeto de que precisa. "Responder" só vai
                      para os comentários raiz (há um único nível de resposta), e a caixa de
                      resposta aberta é indicada pela prop `respondendoAEste`. */}
                  <ComentarioItem
                    comentario={comentario}
                    tema={tema}
                    meuUsuarioId={usuario?.id}
                    onResponder={iniciarResposta}
                    respondendoAEste={respondendoA === comentario.id}
                    onAbrirPerfil={abrirPerfil}
                    onDenunciar={denunciarComentario}
                    onExcluir={confirmarExclusaoComentario}
                    excluindo={excluindoComentarioId === comentario.id}
                  />
                  {comentario.respostas && comentario.respostas.length > 0 ? (
                    <View style={{ gap: tema.spacing.sm, paddingLeft: tema.spacing.lg }}>
                      {comentario.respostas.map((resposta) => (
                        <ComentarioItem
                          key={resposta.id}
                          comentario={resposta}
                          tema={tema}
                          meuUsuarioId={usuario?.id}
                          onAbrirPerfil={abrirPerfil}
                          onDenunciar={denunciarComentario}
                          onExcluir={confirmarExclusaoComentario}
                          excluindo={excluindoComentarioId === resposta.id}
                        />
                      ))}
                    </View>
                  ) : null}

                  {respondendoA === comentario.id ? (
                    <View style={{ gap: tema.spacing.xs, paddingLeft: tema.spacing.lg }}>
                      <CampoTexto
                        rotulo={`Responder a ${comentario.usuario?.nome ?? comentario.autor?.nome ?? "este comentário"}`}
                        value={textoResposta}
                        onChangeText={setTextoResposta}
                        editable={!enviandoResposta}
                        erro={erroResponder ?? undefined}
                      />
                      <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
                        <Botao
                          size="small"
                          onPress={() => void enviarResposta()}
                          carregando={enviandoResposta}
                          disabled={enviandoResposta || textoResposta.trim().length === 0}
                        >
                          Enviar resposta
                        </Botao>
                        <Botao variant="ghost" size="small" onPress={cancelarResposta} disabled={enviandoResposta}>
                          Cancelar
                        </Botao>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
          <CampoTexto
            rotulo="Adicionar um comentário"
            value={novoComentario}
            onChangeText={setNovoComentario}
            editable={!enviandoComentario && !removidaRemotamente}
            erro={erroComentar ?? undefined}
          />
          <Botao
            size="small"
            onPress={() => void comentar()}
            carregando={enviandoComentario}
            disabled={enviandoComentario || novoComentario.trim().length === 0 || removidaRemotamente}
          >
            Comentar
          </Botao>
        </Cartao>
      </ScrollView>

      <Modal
        visible={anexoAmpliado !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnexoAmpliado(null)}
      >
        {/* Cores fixas de propósito (não `tema.colors.*`): o fundo do lightbox é sempre um véu
            escuro, seja o tema claro ou escuro, a mesma exceção de `Botao.tsx`
            (`ripple: "rgba(255,255,255,0.25)"`). Não há problema de contraste (branco sobre
            preto quase opaco). */}
        <Pressable
          onPress={() => setAnexoAmpliado(null)}
          accessibilityRole="button"
          accessibilityLabel="Fechar imagem ampliada"
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center" }}
        >
          {anexoAmpliado ? (
            <Image
              // `cacheKey` pelo `id` do anexo, como no feed: a URL assinada muda a cada busca, o
              // `id` não.
              source={{ uri: anexoAmpliado.url, cacheKey: anexoAmpliado.id }}
              accessible
              accessibilityLabel={anexoAmpliado.descricao || "Imagem ampliada, sem descrição informada."}
              contentFit="contain"
              style={{ width: "100%", height: "80%" }}
            />
          ) : null}
          {anexoAmpliado?.descricao ? (
            <Text style={[tema.typography.bodySmall, { color: "#fff", textAlign: "center", padding: tema.spacing.md }]}>
              {anexoAmpliado.descricao}
            </Text>
          ) : null}
        </Pressable>
      </Modal>
    </ContainerTela>
  );
}
