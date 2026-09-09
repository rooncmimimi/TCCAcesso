import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Linking, Text, View } from "react-native";

import { Button, Card } from "../components/ui";
import type { ArquivoSelecionado, Candidato, RascunhoCurriculo } from "../perfil";
import { PerfilService } from "../perfil";
import { getFriendlyErrorMessage } from "../services/api/errors";
import { useTheme } from "../theme";
import type { Theme } from "../theme";

/** Literal a `MIME_DOCUMENTOS` (`Site/Backend/src/middlewares/uploadMiddleware.js`) — os únicos 3 formatos que o backend aceita para currículo. */
const TIPOS_ACEITOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Sem biblioteca de data nova — `Intl.DateTimeFormat` nativo já resolve. */
function formatarData(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

async function selecionarArquivo(): Promise<ArquivoSelecionado | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: TIPOS_ACEITOS,
    copyToCacheDirectory: true,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  const arquivo = resultado.assets[0];
  return { uri: arquivo.uri, name: arquivo.name, mimeType: arquivo.mimeType };
}

/** Texto único da seção — mensagem amigável e específica para o erro real de seleção de arquivo (nunca o erro técnico do picker). */
function erroSelecao(): string {
  return "Não foi possível abrir o seletor de arquivos agora.";
}

/**
 * Currículo (Fase 13). PDF/DOC/DOCX, campo multipart `"curriculo"`
 * (confirmado por auditoria e ao vivo — ver `PerfilService.ts`).
 *
 * Sem visualizador de PDF embutido no app (instalar um seria uma
 * dependência nova só para isto) — "visualizar"/"baixar" abrem a URL
 * assinada no navegador/leitor padrão do aparelho via `Linking`, mesmo
 * comportamento que qualquer link de documento já tem no Android.
 *
 * SEM BOTÃO DE EXCLUIR: auditoria completa de `candidatoRoutes.js` confirma
 * que não existe nenhum endpoint `DELETE .../curriculo` — só substituir por
 * um novo (o backend já limpa o arquivo antigo do Storage ao fazer isso).
 * Não foi inventado nenhum workaround; registrado como pendência no
 * relatório da Fase 13, aguardando decisão sobre criar o endpoint.
 */
export function CurriculoSecao({
  candidato,
  onAtualizado,
}: {
  candidato: Candidato;
  onAtualizado: (candidato: Candidato) => void;
}) {
  const { theme } = useTheme();

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
    if (!arquivo) return; // usuário cancelou — não é erro

    setEnviando(true);
    try {
      const atualizado = await PerfilService.uploadCurriculo(candidato.id, arquivo);
      onAtualizado(atualizado);
    } catch (erroRequisicao) {
      setErroEnviar(getFriendlyErrorMessage(erroRequisicao, "Não foi possível enviar o currículo agora."));
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
        getFriendlyErrorMessage(
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
      setErroImportar(getFriendlyErrorMessage(erroRequisicao, "Não foi possível importar este currículo agora."));
    } finally {
      setImportando(false);
    }
  }

  const dataFormatada = formatarData(candidato.curriculoAtualizadoEm);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text accessibilityRole="header" style={[theme.typography.title, { color: theme.colors.textPrimary }]}>
        Currículo
      </Text>

      <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
        {candidato.curriculoNome ? (
          <View style={{ gap: 2 }}>
            <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {candidato.curriculoNome}
            </Text>
            {dataFormatada ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
                Enviado em {dataFormatada}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textMuted }]}>
            Nenhum currículo enviado ainda.
          </Text>
        )}

        <Button variant="outline" onPress={() => void enviarCurriculo()} loading={enviando} disabled={enviando}>
          {candidato.curriculoNome ? "Substituir currículo" : "Selecionar e enviar currículo"}
        </Button>
        {erroEnviar ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[theme.typography.caption, { color: theme.colors.error.solid }]}
          >
            {erroEnviar}
          </Text>
        ) : null}

        {candidato.curriculoNome ? (
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Button
              variant="ghost"
              size="small"
              onPress={() => void abrirCurriculo("visualizar")}
              loading={abrindo === "visualizar"}
              disabled={abrindo !== null}
            >
              Visualizar
            </Button>
            <Button
              variant="ghost"
              size="small"
              onPress={() => void abrirCurriculo("baixar")}
              loading={abrindo === "baixar"}
              disabled={abrindo !== null}
            >
              Baixar
            </Button>
          </View>
        ) : null}
        {erroAbrir ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[theme.typography.caption, { color: theme.colors.error.solid }]}
          >
            {erroAbrir}
          </Text>
        ) : null}
      </Card>

      <Card elevation="sm" style={{ gap: theme.spacing.sm }}>
        <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
          Importar dados de um currículo existente
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
          Extraímos o texto do arquivo para te ajudar a preencher o perfil mais rápido — nada é salvo
          automaticamente, você revisa e adiciona manualmente o que quiser nas seções acima.
        </Text>
        <Button variant="outline" size="small" onPress={() => void importarCurriculo()} loading={importando} disabled={importando}>
          Selecionar arquivo para importar
        </Button>
        {erroImportar ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[theme.typography.caption, { color: theme.colors.error.solid }]}
          >
            {erroImportar}
          </Text>
        ) : null}

        {rascunho ? <RascunhoCurriculoVisualizacao rascunho={rascunho} theme={theme} /> : null}
      </Card>
    </View>
  );
}

function RascunhoCurriculoVisualizacao({ rascunho, theme }: { rascunho: RascunhoCurriculo; theme: Theme }) {
  const contato = [rascunho.email, rascunho.telefone, rascunho.linkedin, rascunho.github].filter(Boolean);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: theme.spacing.sm }}
    >
      <Text
        accessibilityRole="alert"
        style={[theme.typography.caption, { color: theme.colors.warning.onSoft, backgroundColor: theme.colors.warning.soft, padding: theme.spacing.xs, borderRadius: theme.radius.sm }]}
      >
        {rascunho.aviso}
      </Text>

      {contato.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Contato encontrado</Text>
          {contato.map((valor) => (
            <Text key={valor} style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
              {valor}
            </Text>
          ))}
        </View>
      ) : null}

      {rascunho.resumo ? (
        <View style={{ gap: 2 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Resumo encontrado</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{rascunho.resumo}</Text>
        </View>
      ) : null}

      {rascunho.experiencias.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
            Trechos que parecem experiência profissional
          </Text>
          {rascunho.experiencias.map((item, indice) => (
            <Text key={indice} style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              {item.descricaoSugerida}
            </Text>
          ))}
        </View>
      ) : null}

      {rascunho.formacoes.length > 0 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>
            Trechos que parecem formação acadêmica
          </Text>
          {rascunho.formacoes.map((item, indice) => (
            <Text key={indice} style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              {item.descricaoSugerida}
            </Text>
          ))}
        </View>
      ) : null}

      {rascunho.habilidades.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textPrimary }]}>Possíveis habilidades</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {rascunho.habilidades.join(", ")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
