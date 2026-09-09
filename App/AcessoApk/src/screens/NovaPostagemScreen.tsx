import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { announceForAccessibility } from "../accessibility";
import { Button, Card, Input, ScreenContainer } from "../components/ui";
import { FeedService } from "../feed";
import type { AnexoParaPublicar } from "../feed";
import type { AppStackParamList } from "../navigation/types";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

const LIMITE_CARACTERES = 3000;
/** Espelha `uploadAnexos.array("arquivos", 4)` (`Site/Backend/src/middlewares/uploadMiddleware.js`). */
const LIMITE_ANEXOS = 4;
/** Espelha `env.security.maxUploadBytes` (padrão real do backend sem `.env` customizado) — checagem no cliente é só para dar um erro amigável ANTES de tentar o upload; o backend continua sendo a autoridade real (`LIMITE_BYTES_POR_MIME`). */
const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024;

type NovaPostagemScreenProps = NativeStackScreenProps<AppStackParamList, "NovaPostagem">;

/**
 * Criar publicação — texto (Fase 10) + até 4 imagens com descrição
 * acessível (Fase 20). Só IMAGEM nesta fase, mesmo o backend também aceitar
 * vídeo em `arquivos` — anexar vídeo fica para uma fase futura (sem player
 * de vídeo em nenhuma tela do app ainda, e um upload de até 50MB merece seu
 * próprio teste dedicado). O backend rejeita `conteudo` vazio SEM nenhum
 * arquivo ("Escreva algo ou anexe um arquivo para publicar."), então o botão
 * só habilita com texto OU pelo menos 1 imagem — mesmo requisito que a API
 * impõe, verificado antes de escrever esta tela.
 */
export function NovaPostagemScreen({ navigation }: NovaPostagemScreenProps) {
  const { theme } = useTheme();
  const [conteudo, setConteudo] = useState("");
  const [anexos, setAnexos] = useState<AnexoParaPublicar[]>([]);
  const [erroAnexar, setErroAnexar] = useState<string | null>(null);
  const [anexando, setAnexando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tamanho = conteudo.length;
  const acimaDoLimite = tamanho > LIMITE_CARACTERES;
  const semConteudo = conteudo.trim().length === 0 && anexos.length === 0;
  const podePublicar = !semConteudo && !acimaDoLimite && !publicando;

  async function escolherImagens() {
    if (anexando || anexos.length >= LIMITE_ANEXOS) return;
    setErroAnexar(null);
    setAnexando(true);
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        setErroAnexar("Não foi possível acessar suas fotos. Autorize o acesso nas configurações do aparelho para anexar imagens.");
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: LIMITE_ANEXOS - anexos.length,
        quality: 0.8,
      });
      if (resultado.canceled || resultado.assets.length === 0) return;

      const grandeDemais = resultado.assets.filter((item) => (item.fileSize ?? 0) > TAMANHO_MAXIMO_IMAGEM_BYTES);
      const aceitas = resultado.assets.filter((item) => (item.fileSize ?? 0) <= TAMANHO_MAXIMO_IMAGEM_BYTES);

      const novos: AnexoParaPublicar[] = aceitas.slice(0, LIMITE_ANEXOS - anexos.length).map((item) => ({
        arquivo: {
          uri: item.uri,
          nome: item.fileName ?? null,
          mimeType: item.mimeType ?? "image/jpeg",
          tamanhoBytes: item.fileSize ?? null,
        },
        descricao: "",
      }));

      setAnexos((atual) => [...atual, ...novos]);

      if (grandeDemais.length > 0) {
        setErroAnexar(
          `${grandeDemais.length === 1 ? "Uma imagem" : `${grandeDemais.length} imagens`} não ${grandeDemais.length === 1 ? "foi anexada" : "foram anexadas"} por ultrapassar o limite de 5MB.`,
        );
      }
    } catch {
      setErroAnexar("Não foi possível abrir a galeria de fotos agora.");
    } finally {
      setAnexando(false);
    }
  }

  function removerAnexo(indice: number) {
    setAnexos((atual) => atual.filter((_item, i) => i !== indice));
  }

  function alterarDescricaoAnexo(indice: number, descricao: string) {
    setAnexos((atual) => atual.map((item, i) => (i === indice ? { ...item, descricao } : item)));
  }

  async function publicar() {
    if (!podePublicar) return;
    setPublicando(true);
    setErro(null);
    try {
      await FeedService.criar({ conteudo: conteudo.trim(), publica: true, anexos });
      // A tela de composição inteira desmonta e volta pro feed — troca de
      // subárvore completa, não um texto aparecendo dentro da mesma árvore
      // já montada (mesma distinção já documentada em
      // `ResetPasswordScreen.tsx`/`LoginScreen.tsx`): por isso
      // `announceForAccessibility`, não uma `accessibilityLiveRegion` aqui.
      announceForAccessibility("Publicação criada.");
      navigation.goBack();
    } catch (erroRequisicao) {
      // Erro NÃO fecha a tela — o texto digitado e os anexos continuam
      // (Fase 10: "preservar texto em caso de erro", estendido a anexos na
      // Fase 20), o usuário só tenta de novo.
      setErro(getFriendlyErrorMessage(erroRequisicao, "Não foi possível publicar agora. Tente novamente."));
    } finally {
      setPublicando(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ gap: theme.spacing.md, paddingVertical: theme.spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          <Card elevation="md" style={{ gap: theme.spacing.sm }}>
            <Input
              label="O que você está pensando?"
              value={conteudo}
              onChangeText={setConteudo}
              multiline
              numberOfLines={8}
              editable={!publicando}
              accessibilityLabel="Texto da publicação"
              style={{ minHeight: 160, textAlignVertical: "top" }}
              error={erro ?? undefined}
            />
            <Text
              // Contador MUDANDO dentro de uma árvore que persiste (o campo
              // não desmonta) — caso de `accessibilityLiveRegion`, não
              // `announceForAccessibility` (mesma política já aplicada ao
              // contador de vagas em `JobsScreen.tsx`).
              accessibilityLiveRegion="polite"
              style={[
                theme.typography.caption,
                { color: acimaDoLimite ? theme.colors.error.solid : theme.colors.textMuted, textAlign: "right" },
              ]}
            >
              {`${tamanho}/${LIMITE_CARACTERES}`}
            </Text>
          </Card>

          <View style={{ gap: theme.spacing.sm }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]}>Fotos</Text>
            {anexos.map((anexo, indice) => (
              <AnexoEditor
                // Lista local, sem `id` (arquivo ainda não publicado) — ordem é estável (só cresce/encolhe por remoção explícita), mesmo raciocínio já aceito nas listas locais de `JobFormScreen.tsx`.
                key={indice}
                anexo={anexo}
                indice={indice}
                theme={theme}
                desabilitado={publicando}
                onRemover={() => removerAnexo(indice)}
                onAlterarDescricao={(descricao) => alterarDescricaoAnexo(indice, descricao)}
              />
            ))}

            <Button
              variant="outline"
              onPress={() => void escolherImagens()}
              loading={anexando}
              disabled={anexando || publicando || anexos.length >= LIMITE_ANEXOS}
            >
              {anexos.length >= LIMITE_ANEXOS ? "Limite de 4 imagens atingido" : "Adicionar foto"}
            </Button>
            {erroAnexar ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[theme.typography.caption, { color: theme.colors.error.solid }]}
              >
                {erroAnexar}
              </Text>
            ) : null}
          </View>

          <Button onPress={() => void publicar()} loading={publicando} disabled={!podePublicar}>
            Publicar
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/**
 * Uma imagem já selecionada + sua descrição acessível — a peça central da
 * Fase 20: nunca deixa a imagem "muda" sem uma decisão explícita do usuário
 * (escrever à mão ou aceitar/editar a sugestão da IA). Função local, não
 * exportada — só `NovaPostagemScreen` consome (`src/feed/` sem subpasta
 * `components/`, mesmo raciocínio de `PostagemListItem`).
 */
function AnexoEditor({
  anexo,
  indice,
  theme,
  desabilitado,
  onRemover,
  onAlterarDescricao,
}: {
  anexo: AnexoParaPublicar;
  indice: number;
  theme: Theme;
  desabilitado: boolean;
  onRemover: () => void;
  onAlterarDescricao: (descricao: string) => void;
}) {
  const [sugerindo, setSugerindo] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  async function sugerirDescricao() {
    if (sugerindo) return;
    setSugerindo(true);
    setErroSugestao(null);
    try {
      const descricao = await FeedService.sugerirDescricao(anexo.arquivo);
      onAlterarDescricao(descricao);
      // A resposta da IA chega de forma assíncrona e pode terminar depois de
      // o usuário já ter movido o foco para outro campo — diferente do
      // contador de caracteres (que muda a cada toque, com o campo em foco),
      // aqui `accessibilityLiveRegion` não é garantia de leitura em todo
      // leitor de tela para uma mudança de VALOR de `TextInput`. Por isso um
      // anúncio explícito, mesmo a árvore persistindo.
      announceForAccessibility(`Descrição sugerida para a imagem ${indice + 1}: ${descricao}`);
    } catch (erroRequisicao) {
      // Nunca impede publicar — mesma regra documentada no backend
      // (`PostagemController.sugerirDescricaoAnexo`): sugestão indisponível
      // é só isso, nunca um bloqueio. O usuário sempre pode escrever à mão.
      setErroSugestao(
        getFriendlyErrorMessage(erroRequisicao, "Sugestão indisponível agora. Você pode escrever a descrição manualmente."),
      );
    } finally {
      setSugerindo(false);
    }
  }

  return (
    <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm, alignItems: "center" }}>
        <Image
          source={{ uri: anexo.arquivo.uri }}
          accessible={false}
          style={{ width: 64, height: 64, borderRadius: theme.radius.md, backgroundColor: theme.colors.divider }}
        />
        <Text style={[theme.typography.label, { color: theme.colors.textPrimary, flex: 1 }]}>Imagem {indice + 1}</Text>
        <Pressable
          onPress={onRemover}
          disabled={desabilitado}
          accessibilityRole="button"
          accessibilityLabel={`Remover imagem ${indice + 1}`}
          hitSlop={8}
          style={{ minHeight: theme.sizes.touchTarget, justifyContent: "center" }}
        >
          <Text style={[theme.typography.bodySmall, { color: theme.colors.error.solid }]}>Remover</Text>
        </Pressable>
      </View>

      <Input
        label={`Descrição da imagem ${indice + 1}`}
        value={anexo.descricao}
        onChangeText={onAlterarDescricao}
        editable={!desabilitado}
        multiline
        helperText="Lida em voz alta por leitores de tela — descreva o que aparece na imagem."
      />

      <Button
        variant="outline"
        size="small"
        onPress={() => void sugerirDescricao()}
        loading={sugerindo}
        disabled={sugerindo || desabilitado}
      >
        Sugerir descrição com IA
      </Button>
      {erroSugestao ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[theme.typography.caption, { color: theme.colors.error.solid }]}
        >
          {erroSugestao}
        </Text>
      ) : null}
    </Card>
  );
}
