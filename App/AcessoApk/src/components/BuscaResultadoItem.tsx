import { Pressable, Text, View } from "react-native";

import { Avatar, Badge, Card } from "./ui";
import type { EmpresaResultadoBusca, TipoBusca, UsuarioResultadoBusca } from "../busca";
import type { Postagem } from "../feed";
import type { Theme } from "../theme";
import { MODALIDADE_LABEL, PUBLICO_ALVO_LABEL } from "../vagas";
import type { Vaga } from "../vagas";

export type ResultadoBusca = UsuarioResultadoBusca | EmpresaResultadoBusca | Vaga | Postagem;

/** Mesmo padrão de `PostagemDetailScreen.tsx`/`ActivitiesScreen.tsx` — duplicado de propósito. */
function formatarData(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(data);
}

/**
 * Um item de resultado de busca global (Fase R2, recomendada), qualquer que
 * seja a categoria — mora em `src/components/` (não duplicado por tela,
 * como a maioria dos itens de lista deste app) porque tem DOIS
 * consumidores de verdade: `SearchScreen` (prévia agrupada, até 5 por
 * categoria) e `SearchResultsScreen` ("ver mais" de uma categoria,
 * paginação completa) — a mesma duplicação que o roteiro de polimento
 * (Fase 26) pede para evitar quando é REAL, não só teórica.
 */
export function BuscaResultadoItem({
  tipo,
  item,
  theme,
  onAbrirUsuario,
  onAbrirVaga,
  onAbrirPostagem,
}: {
  tipo: TipoBusca;
  item: ResultadoBusca;
  theme: Theme;
  onAbrirUsuario: (usuarioId: string) => void;
  onAbrirVaga: (vagaId: string) => void;
  onAbrirPostagem: (postagemId: string) => void;
}) {
  if (tipo === "usuarios") {
    const usuario = item as UsuarioResultadoBusca;
    const subtitulo = [usuario.candidato?.tituloProfissional, [usuario.candidato?.cidade, usuario.candidato?.estado].filter(Boolean).join(" - ")]
      .filter(Boolean)
      .join(" · ");
    return (
      <ItemLinha
        theme={theme}
        titulo={usuario.nome}
        fotoUrl={usuario.fotoPerfil}
        subtitulo={subtitulo || null}
        rotulo={`Abrir perfil de ${usuario.nome}`}
        onPress={() => onAbrirUsuario(usuario.id)}
      />
    );
  }

  if (tipo === "empresas") {
    const empresa = item as EmpresaResultadoBusca;
    const nome = empresa.nomeFantasia ?? empresa.razaoSocial;
    const subtitulo = [empresa.setor, [empresa.cidade, empresa.estado].filter(Boolean).join(" - ")].filter(Boolean).join(" · ");
    return (
      <ItemLinha
        theme={theme}
        titulo={nome}
        fotoUrl={empresa.logo}
        subtitulo={subtitulo || null}
        rotulo={`Abrir perfil de ${nome}`}
        onPress={() => onAbrirUsuario(empresa.usuarioId)}
      />
    );
  }

  if (tipo === "vagas") {
    const vaga = item as Vaga;
    const empresaNome = vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa não informada";
    const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
    const modalidade = MODALIDADE_LABEL[vaga.modalidade] ?? vaga.modalidade;
    const publicoAlvoLabel = vaga.publicoAlvo && vaga.publicoAlvo !== "geral" ? PUBLICO_ALVO_LABEL[vaga.publicoAlvo] : null;
    return (
      <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
        <Pressable
          onPress={() => onAbrirVaga(vaga.id)}
          accessibilityRole="button"
          accessibilityLabel={[vaga.titulo, empresaNome, local || null, modalidade, publicoAlvoLabel].filter(Boolean).join(", ")}
          android_ripple={{ color: theme.colors.divider }}
          style={{ minHeight: theme.sizes.touchTarget }}
        >
          <Card elevation="sm" style={{ gap: theme.spacing.xs }}>
            <Text style={[theme.typography.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {vaga.titulo}
            </Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {empresaNome}
            </Text>
            <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{local ? `${local} · ${modalidade}` : modalidade}</Text>
            {publicoAlvoLabel ? <Badge variant="info">{publicoAlvoLabel}</Badge> : null}
          </Card>
        </Pressable>
      </View>
    );
  }

  // "postagens": `usuario`/`autor` coexistem no contrato real (mesma defesa de `src/feed/types.ts`).
  const postagem = item as Postagem;
  const autor = postagem.usuario ?? postagem.autor;
  const data = formatarData(postagem.created_at);
  const texto = postagem.conteudo?.trim() || "Publicação sem texto";
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onAbrirPostagem(postagem.id)}
        accessibilityRole="button"
        accessibilityLabel={`Publicação de ${autor?.nome ?? "alguém"}: ${texto}`}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ gap: 2 }}>
          {autor?.nome ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {autor.nome}
            </Text>
          ) : null}
          <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {texto}
          </Text>
          {data ? <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>{data}</Text> : null}
        </Card>
      </Pressable>
    </View>
  );
}

/** Item simples de linha (avatar com iniciais + título + subtítulo opcional) — usuários e empresas têm o mesmo formato visual. */
function ItemLinha({
  theme,
  titulo,
  fotoUrl,
  subtitulo,
  rotulo,
  onPress,
}: {
  theme: Theme;
  titulo: string;
  fotoUrl?: string | null;
  subtitulo: string | null;
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <View style={{ borderRadius: theme.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        android_ripple={{ color: theme.colors.divider }}
        style={{ minHeight: theme.sizes.touchTarget }}
      >
        <Card elevation="sm" style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <Avatar nome={titulo} fotoUrl={fotoUrl} size="medium" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[theme.typography.body, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {titulo}
            </Text>
            {subtitulo ? (
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {subtitulo}
              </Text>
            ) : null}
          </View>
        </Card>
      </Pressable>
    </View>
  );
}
