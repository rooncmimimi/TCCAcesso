import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth";
import { Button, Card, ScreenContainer } from "../components/ui";
import { ConversaService } from "../mensagens";
import type { Mensagem, MensagemDigitandoEvento, MensagemLidaEvento, MensagemNovaEvento } from "../mensagens";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { emitirDigitando, entrarNaConversa, ouvirEvento, sairDaConversa } from "../services/socket/socketClient";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_MENSAGENS = 100;
// Mesmo tempo do site (`Site/Frontend/src/routes/mensagens.tsx`) — sem
// evento explícito de "parou de digitar", o próprio recebedor limpa o
// indicador sozinho se nenhum novo `mensagem:digitando` chegar dentro desta
// janela.
const JANELA_DIGITANDO_MS = 3000;

type ConversationScreenProps = NativeStackScreenProps<AppStackParamList, "Conversation">;

function formatarHorario(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

/**
 * Chat 1:1 (Fase 17) — primeira tela do app com Socket.IO. Histórico
 * carregado uma vez via REST (sem paginação de "carregar mais antigas"
 * nesta fase — mesmo recorte do site, que também busca um lote fixo);
 * tempo real só COMPLEMENTA: toda mensagem nova de quem NÃO sou eu recarrega
 * a lista via REST (nunca confia no payload do evento como fonte única —
 * mesma razão documentada em `realtime/socket.js`), a minha própria mensagem
 * enviada já entra na lista pela resposta do POST, sem depender do eco do
 * socket.
 */
export function ConversationScreen({ route, navigation }: ConversationScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { conversaId, nomeOutroParticipante } = route.params;

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const [outroDigitando, setOutroDigitando] = useState(false);
  const [minhaUltimaMensagemVista, setMinhaUltimaMensagemVista] = useState(false);

  const timerDigitandoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listaRef = useRef<FlatList<Mensagem>>(null);

  useEffect(() => {
    navigation.setOptions({ title: nomeOutroParticipante || "Conversa" });
  }, [navigation, nomeOutroParticipante]);

  // Carrega o histórico, entra na sala da conversa (tempo real) e marca como
  // lida — mesma sequência da tela equivalente do site.
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resposta = await ConversaService.listarMensagens(conversaId, { page: 1, limit: LIMITE_MENSAGENS });
        if (cancelado) return;
        setMensagens(resposta.mensagens);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível carregar esta conversa."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    entrarNaConversa(conversaId);
    void ConversaService.marcarComoLidas(conversaId).catch(() => {
      // Não é crítico — mesmo raciocínio de outras marcações "de leitura" no app.
    });

    return () => {
      cancelado = true;
      sairDaConversa(conversaId);
      if (timerDigitandoRef.current) clearTimeout(timerDigitandoRef.current);
    };
  }, [conversaId, tentativa]);

  // Tempo real: mensagem nova nesta conversa. A minha própria (eco do que
  // acabei de enviar) é ignorada aqui — já entrou na lista pela resposta do
  // POST em `enviar()`, evitando um refetch redundante.
  useEffect(() => {
    return ouvirEvento<MensagemNovaEvento>("mensagem:nova", (evento) => {
      if (evento.conversaId !== conversaId) return;
      if (evento.mensagem?.remetenteId === user?.id) return;

      void ConversaService.listarMensagens(conversaId, { page: 1, limit: LIMITE_MENSAGENS })
        .then((resposta) => setMensagens(resposta.mensagens))
        .catch(() => {
          // Falha ao atualizar em tempo real não é crítica — o "Tentar
          // novamente" da tela cheia continua disponível se o carregamento
          // inicial também falhar; aqui é só uma atualização perdida.
        });

      void ConversaService.marcarComoLidas(conversaId).catch(() => undefined);
    });
  }, [conversaId, user?.id]);

  // Tempo real: a outra pessoa leu minhas mensagens.
  useEffect(() => {
    return ouvirEvento<MensagemLidaEvento>("mensagem:lida", (evento) => {
      if (evento.conversaId !== conversaId || evento.usuarioId === user?.id) return;
      setMinhaUltimaMensagemVista(true);
    });
  }, [conversaId, user?.id]);

  // Tempo real: indicador de "digitando" — mesma janela de auto-limpeza do site.
  useEffect(() => {
    return ouvirEvento<MensagemDigitandoEvento>("mensagem:digitando", (evento) => {
      if (evento.conversaId !== conversaId || evento.usuarioId === user?.id) return;
      setOutroDigitando(evento.digitando);
      if (timerDigitandoRef.current) clearTimeout(timerDigitandoRef.current);
      if (evento.digitando) {
        timerDigitandoRef.current = setTimeout(() => setOutroDigitando(false), JANELA_DIGITANDO_MS);
      }
    });
  }, [conversaId, user?.id]);

  function tentarNovamente() {
    setErro(null);
    setCarregando(true);
    setTentativa((valor) => valor + 1);
  }

  function digitar(valor: string) {
    setTexto(valor);
    emitirDigitando(conversaId, true);
  }

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      const nova = await ConversaService.enviarMensagem(conversaId, conteudo);
      setMensagens((atual) => [...atual, nova]);
      setMinhaUltimaMensagemVista(false);
      setTexto("");
    } catch (erroRequisicao) {
      setErroEnvio(getFriendlyErrorMessage(erroRequisicao, "Não foi possível enviar a mensagem agora."));
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.colors.primary.solid} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (erro && mensagens.length === 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[theme.typography.title, { color: theme.colors.textPrimary }]}
            >
              Não foi possível carregar esta conversa
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{erro}</Text>
            <Button onPress={tentarNovamente}>Tentar novamente</Button>
          </Card>
        </View>
      </ScreenContainer>
    );
  }

  const ultimaMinha = [...mensagens].reverse().find((mensagem) => mensagem.remetenteId === user?.id);

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listaRef}
          testID="mensagens-lista"
          data={mensagens}
          keyExtractor={(mensagem) => mensagem.id}
          contentContainerStyle={{ gap: theme.spacing.sm, padding: theme.spacing.md, flexGrow: 1, justifyContent: "flex-end" }}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>
                Nenhuma mensagem ainda. Diga olá!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MensagemBolha
              mensagem={item}
              minha={item.remetenteId === user?.id}
              vista={item.id === ultimaMinha?.id && minhaUltimaMensagemVista}
              theme={theme}
            />
          )}
        />

        {outroDigitando ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[theme.typography.caption, { color: theme.colors.textMuted, paddingHorizontal: theme.spacing.md }]}
          >
            {(nomeOutroParticipante || "A outra pessoa") + " está digitando…"}
          </Text>
        ) : null}

        {erroEnvio ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[theme.typography.caption, { color: theme.colors.error.solid, paddingHorizontal: theme.spacing.md }]}
          >
            {erroEnvio}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <TextInput
            value={texto}
            onChangeText={digitar}
            placeholder="Escreva uma mensagem…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            editable={!enviando}
            accessibilityLabel="Escreva uma mensagem"
            style={[
              theme.typography.body,
              {
                flex: 1,
                maxHeight: 120,
                minHeight: theme.sizes.inputHeight,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surface,
              },
            ]}
          />
          <Button onPress={() => void enviar()} loading={enviando} disabled={enviando || !texto.trim()}>
            Enviar
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/** Função local, não exportada — só `ConversationScreen` consome. */
function MensagemBolha({ mensagem, minha, vista, theme }: { mensagem: Mensagem; minha: boolean; vista: boolean; theme: Theme }) {
  const nomeRemetente = mensagem.remetente?.nome ?? "Usuário removido";
  const rotulo = `${minha ? "Você" : nomeRemetente}, ${formatarHorario(mensagem.created_at)}: ${mensagem.conteudo}`;

  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={{ alignItems: minha ? "flex-end" : "flex-start", gap: 2 }}
    >
      <View
        style={{
          maxWidth: "80%",
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          backgroundColor: minha ? theme.colors.primary.solid : theme.colors.surfaceElevated,
        }}
      >
        <Text style={[theme.typography.body, { color: minha ? theme.colors.primary.onSolid : theme.colors.textPrimary }]}>
          {mensagem.conteudo}
        </Text>
      </View>
      <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
        {formatarHorario(mensagem.created_at)}
        {vista ? " · Visto" : ""}
      </Text>
    </View>
  );
}

