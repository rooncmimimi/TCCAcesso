import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Linking, Text, View } from "react-native";

import { Botao, Cartao, CabecalhoSecao } from "../../components/ui";
import type { ArquivoSelecionado, Candidato, RascunhoCurriculo } from "../../perfil";
import { PerfilService } from "../../perfil";
import { extrairMensagemErro } from "../../services/api/erros";
import { useTema } from "../../tema";
import type { Tema } from "../../tema";
import { formatarDataPorExtenso } from "../../utils/formatacao";

/**
 * Os mesmos formatos de `MIME_DOCUMENTOS` no backend (`middlewares/uploadMiddleware.js`), os únicos
 * aceitos para currículo.
 */
const TIPOS_ACEITOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function selecionarArquivo(): Promise<ArquivoSelecionado | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: TIPOS_ACEITOS,
    copyToCacheDirectory: true,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  const arquivo = resultado.assets[0];
  return { uri: arquivo.uri, name: arquivo.name, mimeType: arquivo.mimeType };
}

/** Texto único da seção: mensagem amigável e específica para o erro real de seleção de arquivo (nunca o erro técnico do picker). */
function erroSelecao(): string {
  return "Não foi possível abrir o seletor de arquivos agora.";
}

/**
 * Currículo em PDF, DOC ou DOCX (campo multipart `curriculo`). O app não tem visualizador de PDF:
 * visualizar e baixar abrem a URL assinada no aplicativo padrão do aparelho via `Linking`.
 *
 * Não há botão de excluir porque a API não tem essa rota; só dá para enviar outro arquivo, e o
 * backend apaga o anterior.
 */
export function SecaoCurriculo({
  candidato,
  onAtualizado,
}: {
  candidato: Candidato;
  onAtualizado: (candidato: Candidato) => void;
}) {
  const { tema } = useTema();

  const [enviando, setEnviando] = useState(false);
  const [erroEnviar, setErroEnviar] = useState<string | null>(null);

  const [abrindo, setAbrindo] = useState<"visualizar" | "baixar" | null>(null);
  const [erroAbrir, setErroAbrir] = useState<string | null>(null);

  const [importando, setImportando] = useState(false);
  const [erroImportar, setErroImportar] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoCurriculo | null>(null);

  async function enviarCurriculo() {
    if (enviando) return;
    setErroEnviar(null);
    let arquivo: ArquivoSelecionado | null;
    try {
      arquivo = await selecionarArquivo();
    } catch {
      setErroEnviar(erroSelecao());
      return;
    }
    if (!arquivo) return; // usuário cancelou: não é erro

    setEnviando(true);
    try {
      const atualizado = await PerfilService.uploadCurriculo(candidato.id, arquivo);
      onAtualizado(atualizado);
    } catch (erroRequisicao) {
      setErroEnviar(extrairMensagemErro(erroRequisicao, "Não foi possível enviar o currículo agora."));
    } finally {
      setEnviando(false);
    }
  }

  async function abrirCurriculo(modo: "visualizar" | "baixar") {
    if (abrindo) return;
    setAbrindo(modo);
    setErroAbrir(null);
    try {
      const { url } =
        modo === "visualizar"
          ? await PerfilService.obterUrlCurriculo(candidato.id)
          : await PerfilService.obterUrlDownloadCurriculo(candidato.id);
      await Linking.openURL(url);
    } catch (erroRequisicao) {
      setErroAbrir(
        extrairMensagemErro(
          erroRequisicao,
          modo === "visualizar" ? "Não foi possível abrir o currículo agora." : "Não foi possível baixar o currículo agora.",
        ),
      );
    } finally {
      setAbrindo(null);
    }
  }

  async function importarCurriculo() {
    if (importando) return;
    setErroImportar(null);
    let arquivo: ArquivoSelecionado | null;
    try {
      arquivo = await selecionarArquivo();
    } catch {
      setErroImportar(erroSelecao());
      return;
    }
    if (!arquivo) return;

    setImportando(true);
    setRascunho(null);
    try {
      const resultado = await PerfilService.importarCurriculo(candidato.id, arquivo);
      setRascunho(resultado);
    } catch (erroRequisicao) {
      setErroImportar(extrairMensagemErro(erroRequisicao, "Não foi possível importar este currículo agora."));
    } finally {
      setImportando(false);
    }
  }

  const dataFormatada = formatarDataPorExtenso(candidato.curriculoAtualizadoEm);

  return (
    <View style={{ gap: tema.spacing.sm }}>
      <CabecalhoSecao titulo="Currículo" icone="document-text-outline" />

      <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
        {candidato.curriculoNome ? (
          <View style={{ gap: 2 }}>
            <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
              {candidato.curriculoNome}
            </Text>
            {dataFormatada ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
                Enviado em {dataFormatada}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textMuted }]}>
            Nenhum currículo enviado ainda.
          </Text>
        )}

        <Botao variant="outline" onPress={() => void enviarCurriculo()} carregando={enviando} disabled={enviando}>
          {candidato.curriculoNome ? "Substituir currículo" : "Selecionar e enviar currículo"}
        </Botao>
        {erroEnviar ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[tema.typography.caption, { color: tema.colors.error.solid }]}
          >
            {erroEnviar}
          </Text>
        ) : null}

        {candidato.curriculoNome ? (
          <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
            <Botao
              variant="ghost"
              size="small"
              onPress={() => void abrirCurriculo("visualizar")}
              carregando={abrindo === "visualizar"}
              disabled={abrindo !== null}
            >
              Visualizar
            </Botao>
            <Botao
              variant="ghost"
              size="small"
              onPress={() => void abrirCurriculo("baixar")}
              carregando={abrindo === "baixar"}
              disabled={abrindo !== null}
            >
              Baixar
            </Botao>
          </View>
        ) : null}
        {erroAbrir ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[tema.typography.caption, { color: tema.colors.error.solid }]}
          >
            {erroAbrir}
          </Text>
        ) : null}
      </Cartao>

      <Cartao elevacao="sm" style={{ gap: tema.spacing.sm }}>
        <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
          Importar dados de um currículo existente
        </Text>
        <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
          Extraímos o texto do arquivo para te ajudar a preencher o perfil mais rápido — nada é salvo
          automaticamente, você revisa e adiciona manualmente o que quiser nas seções acima.
        </Text>
        <Botao variant="outline" size="small" onPress={() => void importarCurriculo()} carregando={importando} disabled={importando}>
          Selecionar arquivo para importar
        </Botao>
        {erroImportar ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[tema.typography.caption, { color: tema.colors.error.solid }]}
          >
            {erroImportar}
          </Text>
        ) : null}

        {rascunho ? <RascunhoCurriculoVisualizacao rascunho={rascunho} tema={tema} /> : null}
      </Cartao>
    </View>
  );
}

function RascunhoCurriculoVisualizacao({ rascunho, tema }: { rascunho: RascunhoCurriculo; tema: Tema }) {
  const contato = [rascunho.email, rascunho.telefone, rascunho.linkedin, rascunho.github].filter(Boolean);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: tema.spacing.sm, borderTopWidth: 1, borderTopColor: tema.colors.divider, paddingTop: tema.spacing.sm }}
    >
      <Text
        accessibilityRole="alert"
        style={[tema.typography.caption, { color: tema.colors.warning.onSoft, backgroundColor: tema.colors.warning.soft, padding: tema.spacing.xs, borderRadius: tema.radius.sm }]}
      >
        {rascunho.aviso}
      </Text>

      {contato.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Contato encontrado</Text>
          {contato.map((valor) => (
            <Text key={valor} style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
              {valor}
            </Text>
          ))}
        </View>
      ) : null}

      {rascunho.resumo ? (
        <View style={{ gap: 2 }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Resumo encontrado</Text>
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>{rascunho.resumo}</Text>
        </View>
      ) : null}

      {rascunho.experiencias.length > 0 ? (
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
            Trechos que parecem experiência profissional
          </Text>
          {rascunho.experiencias.map((item, indice) => (
            <Text key={indice} style={[tema.typography.caption, { color: tema.colors.textSecondary }]}>
              {item.descricaoSugerida}
            </Text>
          ))}
        </View>
      ) : null}

      {rascunho.formacoes.length > 0 ? (
        <View style={{ gap: tema.spacing.xs }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
            Trechos que parecem formação acadêmica
          </Text>
          {rascunho.formacoes.map((item, indice) => (
            <Text key={indice} style={[tema.typography.caption, { color: tema.colors.textSecondary }]}>
              {item.descricaoSugerida}
            </Text>
          ))}
        </View>
      ) : null}

      {rascunho.habilidades.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>Possíveis habilidades</Text>
          <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]}>
            {rascunho.habilidades.join(", ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
