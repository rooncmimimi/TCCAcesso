import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAutenticacao } from "../autenticacao";
import { Botao, EstadoErro, EstadoCarregamento, ContainerTela } from "../components/ui";
import { ConversaService } from "../mensagens";
import type { Mensagem, MensagemDigitandoEvento, MensagemLidaEvento, MensagemNovaEvento } from "../mensagens";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { emitirDigitando, entrarNaConversa, ouvirEvento, sairDaConversa } from "../services/socket/socketClient";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const LIMITE_MENSAGENS = 100;
// Mesmo tempo do Site (`Site/Frontend/src/routes/mensagens.tsx`): não há evento de "parou de
// digitar", então o indicador some sozinho se nenhum `mensagem:digitando` chegar nesse intervalo.
const JANELA_DIGITANDO_MS = 3000;

type ConversationScreenProps = NativeStackScreenProps<AppStackParamList, "Conversation">;

function formatarHorario(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

/**
 * Conversa entre duas pessoas. O histórico carrega uma vez pela API, num lote fixo e sem "carregar
 * mais antigas", como no Site. O tempo real só complementa: mensagem nova da outra pessoa recarrega
 * a lista pela API, e a mensagem enviada daqui entra pela resposta do POST, sem esperar o eco do
 * socket.
 */
export function ConversaScreen({ route, navigation }: ConversationScreenProps) {
  const { tema } = useTema();
  const { usuario } = useAutenticacao();
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
  // lida: mesma sequência da tela equivalente do site.
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resposta = await ConversaService.listarMensagens(conversaId, { page: 1, limit: LIMITE_MENSAGENS });
        if (cancelado) return;
        setMensagens(resposta.mensagens);
      } catch (erroRequisicao) {
        if (cancelado) return;
        setErro(extrairMensagemErro(erroRequisicao, "Não foi possível carregar esta conversa."));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    void carregar();
    entrarNaConversa(conversaId);
    void ConversaService.marcarComoLidas(conversaId).catch(() => {
      // Não é crítico: mesmo raciocínio de outras marcações "de leitura" no app.
    });

    return () => {
      cancelado = true;
      sairDaConversa(conversaId);
      if (timerDigitandoRef.current) clearTimeout(timerDigitandoRef.current);
    };
  }, [conversaId, tentativa]);

  // Tempo real: mensagem nova nesta conversa. A minha própria (eco do que
  // acabei de enviar) é ignorada aqui: já entrou na lista pela resposta do
  // POST em `enviar()`, evitando um refetch redundante.
  useEffect(() => {
    return ouvirEvento<MensagemNovaEvento>("mensagem:nova", (evento) => {
      if (evento.conversaId !== conversaId) return;
      if (evento.mensagem?.remetenteId === usuario?.id) return;

      void ConversaService.listarMensagens(conversaId, { page: 1, limit: LIMITE_MENSAGENS })
        .then((resposta) => setMensagens(resposta.mensagens))
        .catch(() => {
          // Falha ao atualizar em tempo real não é crítica: o "Tentar
          // novamente" da tela cheia continua disponível se o carregamento
          // inicial também falhar; aqui é só uma atualização perdida.
        });

      void ConversaService.marcarComoLidas(conversaId).catch(() => undefined);
    });
  }, [conversaId, usuario?.id]);

  // Tempo real: a outra pessoa leu minhas mensagens.
  useEffect(() => {
    return ouvirEvento<MensagemLidaEvento>("mensagem:lida", (evento) => {
      if (evento.conversaId !== conversaId || evento.usuarioId === usuario?.id) return;
      setMinhaUltimaMensagemVista(true);
    });
  }, [conversaId, usuario?.id]);

  // Tempo real: indicador de "digitando", mesma janela de auto-limpeza do site.
  useEffect(() => {
    return ouvirEvento<MensagemDigitandoEvento>("mensagem:digitando", (evento) => {
      if (evento.conversaId !== conversaId || evento.usuarioId === usuario?.id) return;
      setOutroDigitando(evento.digitando);
      if (timerDigitandoRef.current) clearTimeout(timerDigitandoRef.current);
      if (evento.digitando) {
        timerDigitandoRef.current = setTimeout(() => setOutroDigitando(false), JANELA_DIGITANDO_MS);
      }
    });
  }, [conversaId, usuario?.id]);

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
      setErroEnvio(extrairMensagemErro(erroRequisicao, "Não foi possível enviar a mensagem agora."));
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return <EstadoCarregamento />;
  }

  if (erro && mensagens.length === 0) {
    return <EstadoErro titulo="Não foi possível carregar esta conversa" mensagem={erro} onTentarNovamente={tentarNovamente} />;
  }

  const ultimaMinha = [...mensagens].reverse().find((mensagem) => mensagem.remetenteId === usuario?.id);

  return (
    <ContainerTela>
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
          // Mesmo motivo do `FeedScreen.tsx`, com valores maiores: uma bolha de mensagem é mais
          // leve que um cartão do feed, e a conversa pode trazer até `LIMITE_MENSAGENS` (100) de
          // uma vez.
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={10}
          contentContainerStyle={{ gap: tema.spacing.sm, padding: tema.spacing.md, flexGrow: 1, justifyContent: "flex-end" }}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={[tema.typography.body, { color: tema.colors.textMuted }]}>
                Nenhuma mensagem ainda. Diga olá!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MensagemBolha
              mensagem={item}
              minha={item.remetenteId === usuario?.id}
              vista={item.id === ultimaMinha?.id && minhaUltimaMensagemVista}
              tema={tema}
            />
          )}
        />

        {outroDigitando ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[tema.typography.caption, { color: tema.colors.textMuted, paddingHorizontal: tema.spacing.md }]}
          >
            {(nomeOutroParticipante || "A outra pessoa") + " está digitando…"}
          </Text>
        ) : null}

        {erroEnvio ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[tema.typography.caption, { color: tema.colors.error.solid, paddingHorizontal: tema.spacing.md }]}
          >
            {erroEnvio}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: tema.spacing.sm,
            padding: tema.spacing.md,
            borderTopWidth: 1,
            borderTopColor: tema.colors.border,
          }}
        >
          <TextInput
            value={texto}
            onChangeText={digitar}
            placeholder="Escreva uma mensagem…"
            placeholderTextColor={tema.colors.textMuted}
            multiline
            editable={!enviando}
            accessibilityLabel="Escreva uma mensagem"
            style={[
              tema.typography.body,
              {
                flex: 1,
                maxHeight: 120,
                minHeight: tema.sizes.inputHeight,
                borderWidth: 1,
                borderColor: tema.colors.border,
                borderRadius: tema.radius.lg,
                paddingHorizontal: tema.spacing.md,
                paddingVertical: tema.spacing.sm,
                color: tema.colors.textPrimary,
                backgroundColor: tema.colors.surface,
              },
            ]}
          />
          <Botao onPress={() => void enviar()} carregando={enviando} disabled={enviando || !texto.trim()}>
            Enviar
          </Botao>
        </View>
      </KeyboardAvoidingView>
    </ContainerTela>
  );
}

function MensagemBolha({ mensagem, minha, vista, tema }: { mensagem: Mensagem; minha: boolean; vista: boolean; tema: Tema }) {
  const nomeRemetente = mensagem.remetente?.nome ?? "Usuário removido";
  const rotulo = `${minha ? "Você" : nomeRemetente}, ${formatarHorario(mensagem.criadoEm)}: ${mensagem.conteudo}`;

  return (
    <View
      accessible
      accessibilityLabel={rotulo}
      style={{ alignItems: minha ? "flex-end" : "flex-start", gap: 2 }}
    >
      <View
        style={{
          maxWidth: "80%",
          borderRadius: tema.radius.lg,
          paddingHorizontal: tema.spacing.md,
          paddingVertical: tema.spacing.sm,
          backgroundColor: minha ? tema.colors.primary.solid : tema.colors.surfaceElevated,
        }}
      >
        <Text style={[tema.typography.body, { color: minha ? tema.colors.primary.onSolid : tema.colors.textPrimary }]}>
          {mensagem.conteudo}
        </Text>
      </View>
      <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
        {formatarHorario(mensagem.criadoEm)}
        {vista ? " · Visto" : ""}
      </Text>
    </View>
  );
}

