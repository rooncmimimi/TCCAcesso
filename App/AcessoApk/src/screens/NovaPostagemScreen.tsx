import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { anunciarParaLeitorDeTela } from "../acessibilidade";
import { Botao, Cartao, CampoTexto, ContainerTela } from "../components/ui";
import { FeedService } from "../feed";
import type { AnexoParaPublicar } from "../feed";
import type { AppStackParamList } from "../navigation/types";
import { extrairMensagemErro } from "../services/api/erros";
import { useTema } from "../tema";
import type { Tema } from "../tema";

const LIMITE_CARACTERES = 3000;
/** Espelha `uploadAnexos.array("arquivos", 4)` (`Site/Backend/src/middlewares/uploadMiddleware.js`). */
const LIMITE_ANEXOS = 4;
/**
 * Mesmo valor padrão de `env.security.maxUploadBytes` no backend. A checagem aqui só dá um erro
 * amigável antes do upload; quem decide é o backend (`LIMITE_BYTES_POR_MIME`).
 */
const TAMANHO_MAXIMO_IMAGEM_BYTES = 5 * 1024 * 1024;

type NovaPostagemScreenProps = NativeStackScreenProps<AppStackParamList, "NovaPostagem">;

/**
 * Nova publicação: texto e até 4 imagens, cada uma com descrição acessível. O backend também aceita
 * vídeo, mas o app ainda não tem player, então só imagens são anexadas.
 *
 * O backend recusa publicação sem texto e sem arquivo, por isso o botão só habilita com texto ou
 * com pelo menos uma imagem.
 */
export function NovaPostagemScreen({ navigation }: NovaPostagemScreenProps) {
  const { tema } = useTema();
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
      // A tela de composição fecha e volta para o feed, então não há um nó estável para
      // `accessibilityLiveRegion`; o anúncio usa `anunciarParaLeitorDeTela`.
      anunciarParaLeitorDeTela("Publicação criada.");
      navigation.goBack();
    } catch (erroRequisicao) {
      // O erro não fecha a tela: texto e anexos continuam, e a pessoa só tenta de novo.
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível publicar agora. Tente novamente."));
    } finally {
      setPublicando(false);
    }
  }

  return (
    <ContainerTela>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ gap: tema.spacing.md, paddingVertical: tema.spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          <Cartao elevacao="md" style={{ gap: tema.spacing.sm }}>
            <CampoTexto
              rotulo="O que você está pensando?"
              value={conteudo}
              onChangeText={setConteudo}
              multiline
              numberOfLines={8}
              editable={!publicando}
              accessibilityLabel="Texto da publicação"
              style={{ minHeight: 160, textAlignVertical: "top" }}
              erro={erro ?? undefined}
            />
            <Text
              // O contador muda num campo que continua montado, então `accessibilityLiveRegion`
              // funciona aqui (como no contador de vagas de `VagasScreen.tsx`).
              accessibilityLiveRegion="polite"
              style={[
                tema.typography.caption,
                { color: acimaDoLimite ? tema.colors.error.solid : tema.colors.textMuted, textAlign: "right" },
              ]}
            >
              {`${tamanho}/${LIMITE_CARACTERES}`}
            </Text>
          </Cartao>

          <View style={{ gap: tema.spacing.sm }}>
            <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]}>Fotos</Text>
            {anexos.map((anexo, indice) => (
              <AnexoEditor
                // Os arquivos ainda não publicados não têm `id`. A ordem só muda por remoção
                // explícita, então o índice serve de chave, como nas listas locais de
                // `FormularioVagaScreen.tsx`.
                key={indice}
                anexo={anexo}
                indice={indice}
                tema={tema}
                desabilitado={publicando}
                onRemover={() => removerAnexo(indice)}
                onAlterarDescricao={(descricao) => alterarDescricaoAnexo(indice, descricao)}
              />
            ))}

            <Botao
              variant="outline"
              onPress={() => void escolherImagens()}
              carregando={anexando}
              disabled={anexando || publicando || anexos.length >= LIMITE_ANEXOS}
            >
              {anexos.length >= LIMITE_ANEXOS ? "Limite de 4 imagens atingido" : "Adicionar foto"}
            </Botao>
            {erroAnexar ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={[tema.typography.caption, { color: tema.colors.error.solid }]}
              >
                {erroAnexar}
              </Text>
            ) : null}
          </View>

          <Botao onPress={() => void publicar()} carregando={publicando} disabled={!podePublicar}>
            Publicar
          </Botao>
        </ScrollView>
      </KeyboardAvoidingView>
    </ContainerTela>
  );
}

/**
 * Imagem escolhida e sua descrição acessível. A imagem nunca fica sem uma decisão da pessoa:
 * escrever a descrição ou aceitar e editar a sugestão da IA.
 */
function AnexoEditor({
  anexo,
  indice,
  tema,
  desabilitado,
  onRemover,
  onAlterarDescricao,
}: {
  anexo: AnexoParaPublicar;
  indice: number;
  tema: Tema;
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
      // o usuário já ter movido o foco para outro campo: diferente do
      // contador de caracteres (que muda a cada toque, com o campo em foco),
      // aqui `accessibilityLiveRegion` não é garantia de leitura em todo
      // leitor de tela para uma mudança de valor de `TextInput`. Por isso um
      // anúncio explícito, mesmo a árvore persistindo.
      anunciarParaLeitorDeTela(`Descrição sugerida para a imagem ${indice + 1}: ${descricao}`);
    } catch (erroRequisicao) {
      // Nunca impede publicar, pela mesma regra documentada no backend
      // (`PostagemController.sugerirDescricaoAnexo`): sugestão indisponível
      // é só isso, nunca um bloqueio. O usuário sempre pode escrever à mão.
      setErroSugestao(
        extrairMensagemErro(erroRequisicao, "Sugestão indisponível agora. Você pode escrever a descrição manualmente."),
      );
    } finally {
      setSugerindo(false);
    }
  }

  return (
    <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
      <View style={{ flexDirection: "row", gap: tema.spacing.sm, alignItems: "center" }}>
        <Image
          source={{ uri: anexo.arquivo.uri }}
          accessible={false}
          style={{ width: 64, height: 64, borderRadius: tema.radius.md, backgroundColor: tema.colors.divider }}
        />
        <Text style={[tema.typography.label, { color: tema.colors.textPrimary, flex: 1 }]}>Imagem {indice + 1}</Text>
        <Pressable
          onPress={onRemover}
          disabled={desabilitado}
          accessibilityRole="button"
          accessibilityLabel={`Remover imagem ${indice + 1}`}
          hitSlop={8}
          style={{ minHeight: tema.sizes.touchTarget, justifyContent: "center" }}
        >
          <Text style={[tema.typography.bodySmall, { color: tema.colors.error.solid }]}>Remover</Text>
        </Pressable>
      </View>

      <CampoTexto
        rotulo={`Descrição da imagem ${indice + 1}`}
        value={anexo.descricao}
        onChangeText={onAlterarDescricao}
        editable={!desabilitado}
        multiline
        textoAjuda="Lida em voz alta por leitores de tela — descreva o que aparece na imagem."
      />

      <Botao
        variant="outline"
        size="small"
        onPress={() => void sugerirDescricao()}
        carregando={sugerindo}
        disabled={sugerindo || desabilitado}
      >
        Sugerir descrição com IA
      </Botao>
      {erroSugestao ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={[tema.typography.caption, { color: tema.colors.error.solid }]}
        >
          {erroSugestao}
        </Text>
      ) : null}
    </Cartao>
  );
}
