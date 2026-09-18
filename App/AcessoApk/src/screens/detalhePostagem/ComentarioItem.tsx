import { memo } from "react";
import { Pressable, Text, View } from "react-native";

import { Avatar } from "../../components/ui";
import type { Comentario } from "../../feed";
import type { Tema } from "../../tema";
import { formatarDataPorExtenso } from "../../utils/formatacao";

/**
 * Comentário ou resposta no detalhe da publicação. `onResponder` não é passado para as respostas
 * (há um único nível), e a caixa de resposta aberta é indicada por `respondendoAEste`. `onExcluir`
 * só aparece nos comentários do próprio usuário.
 *
 * Com `memo` e handlers estáveis que recebem o id como parâmetro, comentar, responder ou excluir um
 * comentário não renderiza os outros de novo.
 */
export const ComentarioItem = memo(function ComentarioItem({
  comentario,
  tema,
  meuUsuarioId,
  onResponder,
  respondendoAEste = false,
  onAbrirPerfil,
  onDenunciar,
  onExcluir,
  excluindo = false,
}: {
  comentario: Comentario;
  tema: Tema;
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
  const dataFormatada = formatarDataPorExtenso(comentario.criadoEm);

  return (
    <View style={{ flexDirection: "row", gap: tema.spacing.sm }}>
      {/* Um só alvo de toque (avatar) para abrir o perfil: evita dois
          elementos com rótulo diferente para a mesma ação (o nome, junto do
          resto do comentário, não é tocável em separado). */}
      <Pressable
        onPress={() => autor?.id && onAbrirPerfil(autor.id)}
        disabled={!autor?.id}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${autor?.nome ?? "Usuário do ACESSO"}`}
        // Avatar de 40dp: 4 de cada lado leva a área de toque a 48dp.
        hitSlop={4}
      >
        {/* `size="medium"`: o `hitSlop` acima conta com um avatar de 40dp; um avatar menor
            deixaria a área de toque abaixo de 48dp. */}
        <Avatar nome={autor?.nome} fotoUrl={autor?.fotoPerfil} size="medium" />
      </Pressable>
      <View style={{ flex: 1, gap: tema.spacing.xs }}>
        <Text style={[tema.typography.label, { color: tema.colors.textPrimary }]}>
          {autor?.nome ?? "Usuário do ACESSO"}
        </Text>
        <Text style={[tema.typography.bodySmall, { color: tema.colors.textPrimary }]}>{comentario.comentario}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
          {dataFormatada ? (
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{dataFormatada}</Text>
          ) : null}
          {/* Enquanto a caixa de resposta deste comentário já está aberta, o botão
              "Responder" some (evita duas ações com o mesmo rótulo lidas pelo TalkBack
              ao mesmo tempo). */}
          {onResponder && !respondendoAEste ? (
            <Pressable
              onPress={() => onResponder(comentario.id)}
              accessibilityRole="button"
              accessibilityLabel={`Responder a ${autor?.nome ?? "este comentário"}`}
              // 16 em cima e embaixo levam o toque a 48dp. Só na vertical: "Responder" fica ao lado
              // de "Denunciar" ou "Excluir" a 8dp, e ampliar os lados sobreporia as áreas de toque.
              hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
            >
              <Text style={[tema.typography.caption, { color: tema.colors.primary.solid, fontWeight: "700" }]}>
                Responder
              </Text>
            </Pressable>
          ) : null}
          {!ehMeuComentario ? (
            <Pressable
              onPress={() => onDenunciar(comentario.id, autor?.nome)}
              accessibilityRole="button"
              accessibilityLabel={`Denunciar comentário de ${autor?.nome ?? "este usuário"}`}
              // Mesmo ajuste de "Responder": só na vertical, pelo vizinho a 8dp.
              hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
            >
              <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>Denunciar</Text>
            </Pressable>
          ) : null}
          {ehMeuComentario && onExcluir ? (
            <Pressable
              onPress={() => onExcluir(comentario.id)}
              disabled={excluindo}
              accessibilityRole="button"
              accessibilityLabel="Excluir meu comentário"
              accessibilityState={{ disabled: excluindo }}
              // Mesmo ajuste de "Responder": só na vertical, pelo vizinho a 8dp.
              hitSlop={{ top: 16, bottom: 16, left: 0, right: 0 }}
            >
              <Text style={[tema.typography.caption, { color: tema.colors.error.solid, fontWeight: "700" }]}>
                {excluindo ? "Excluindo…" : "Excluir"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});
