import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Botao, CampoTexto } from "../../components/ui";
import { FeedService } from "../../feed";
import type { PostagemAnexo } from "../../feed";
import { extrairMensagemErro } from "../../services/api/erros";
import type { Tema } from "../../tema";

/**
 * Imagem anexada a uma publicação. Sempre tem `accessibilityLabel`: a descrição escrita pelo autor
 * ou um aviso de que não há descrição. Abre em tela cheia ao tocar.
 *
 * Se a URL assinada expirar (`onError`), pede uma nova uma única vez. Para autores de perfil
 * privado a assinatura dura pouco (`signedUrlExpiresSeconds` no backend), e sem isso uma leitura
 * longa acabaria numa imagem quebrada.
 */
export function AnexoImagem({
  anexo,
  postagemId,
  tema,
  podeEditarDescricao,
  onAmpliar,
  onSalvarDescricao,
}: {
  anexo: PostagemAnexo;
  postagemId: string;
  tema: Tema;
  podeEditarDescricao: boolean;
  onAmpliar: () => void;
  onSalvarDescricao: (descricao: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(anexo.url);
  const [jaRenovou, setJaRenovou] = useState(false);
  // `anexo.url` pode mudar entre renderizações sem o componente remontar
  // (mesmo `id`, `key` igual): a assinatura é regerada a cada resposta do
  // backend (editar a descrição, ou o refetch de `feed:postagem`
  // `atualizada` em tempo real). Reseta o estado local durante a
  // renderização (comparando com o último `anexo.url` visto), não num
  // `useEffect`: é o padrão recomendado pelo próprio React para "ajustar
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
    if (jaRenovou) return; // só tenta renovar uma vez: evita loop se o problema for outro (rede, arquivo removido do bucket).
    setJaRenovou(true);
    try {
      const renovado = await FeedService.obterUrlAnexo(postagemId, anexo.id);
      setUrl(renovado.url);
    } catch {
      // Sem fallback além disso: a imagem só continua não carregando,
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
      setErro(extrairMensagemErro(erroRequisicao, "Não foi possível salvar a descrição agora."));
    } finally {
      setSalvando(false);
    }
  }

  if (anexo.tipo !== "imagem") {
    return (
      <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>
        {anexo.tipo === "video" ? "Vídeo anexado (sem player nesta versão do app)." : "Arquivo anexado."}
      </Text>
    );
  }

  return (
    <View style={{ gap: tema.spacing.xs }}>
      <Pressable onPress={onAmpliar} accessibilityRole="button" accessibilityLabel="Ver imagem ampliada">
        <Image
          // `cacheKey` pelo `id` do anexo, nunca pela `url`, que muda a cada nova assinatura
          // (inclusive quando `aoFalharCarregamento` renova a URL); o `id` continua sendo o mesmo
          // arquivo.
          source={{ uri: url, cacheKey: anexo.id }}
          onError={() => void aoFalharCarregamento()}
          accessible
          accessibilityLabel={anexo.descricao || "Imagem anexada à publicação, sem descrição informada."}
          contentFit="cover"
          style={{ width: "100%", height: 220, borderRadius: tema.radius.md, backgroundColor: tema.colors.divider }}
        />
      </Pressable>

      {editando ? (
        <View style={{ gap: tema.spacing.xs }}>
          <CampoTexto
            rotulo="Descrição da imagem"
            value={texto}
            onChangeText={setTexto}
            multiline
            editable={!salvando}
            erro={erro ?? undefined}
            textoAjuda="Lida em voz alta por leitores de tela."
          />
          <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
            <Botao size="small" onPress={() => void salvar()} carregando={salvando} disabled={salvando}>
              Salvar
            </Botao>
            <Botao variant="ghost" size="small" onPress={() => setEditando(false)} disabled={salvando}>
              Cancelar
            </Botao>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: tema.spacing.sm }}>
          <Text style={[tema.typography.caption, { color: tema.colors.textMuted, flex: 1 }]}>
            {anexo.descricao || "Sem descrição."}
          </Text>
          {podeEditarDescricao ? (
            <Pressable
              onPress={iniciarEdicao}
              accessibilityRole="button"
              accessibilityLabel="Editar descrição da imagem"
              // Texto `caption` com uns 16dp de altura: 16 em cima e embaixo levam o toque a 48dp.
              // Só na vertical, porque dos lados invadiria o botão vizinho, a 8dp de distância.
              hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
            >
              <Text style={[tema.typography.caption, { color: tema.colors.primary.solid, fontWeight: "700" }]}>
                Editar
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
