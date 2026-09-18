import { Pressable, Text, View } from "react-native";

import { Avatar, Etiqueta, Cartao } from "./ui";
import type { EmpresaResultadoBusca, TipoBusca, UsuarioResultadoBusca } from "../busca";
import type { Postagem } from "../feed";
import type { Tema } from "../tema";
import { ROTULOS_MODALIDADE, ROTULOS_PUBLICO_ALVO } from "../vagas";
import type { Vaga } from "../vagas";
import { formatarDataPorExtenso } from "../utils/formatacao";

export type ResultadoBusca = UsuarioResultadoBusca | EmpresaResultadoBusca | Vaga | Postagem;

/**
 * Item de resultado da busca global, para qualquer categoria. Fica em `components/` porque é usado
 * por duas telas: `BuscaScreen` (prévia agrupada) e `ResultadosBuscaScreen` (lista completa de uma
 * categoria).
 */
export function BuscaResultadoItem({
  tipo,
  item,
  tema,
  onAbrirUsuario,
  onAbrirVaga,
  onAbrirPostagem,
}: {
  tipo: TipoBusca;
  item: ResultadoBusca;
  tema: Tema;
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
        tema={tema}
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
        tema={tema}
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
    const modalidade = ROTULOS_MODALIDADE[vaga.modalidade] ?? vaga.modalidade;
    const publicoAlvoLabel = vaga.publicoAlvo && vaga.publicoAlvo !== "geral" ? ROTULOS_PUBLICO_ALVO[vaga.publicoAlvo] : null;
    return (
      <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
        <Pressable
          onPress={() => onAbrirVaga(vaga.id)}
          accessibilityRole="button"
          accessibilityLabel={[vaga.titulo, empresaNome, local || null, modalidade, publicoAlvoLabel].filter(Boolean).join(", ")}
          android_ripple={{ color: tema.colors.divider }}
          style={{ minHeight: tema.sizes.touchTarget }}
        >
          <Cartao elevacao="sm" style={{ gap: tema.spacing.xs }}>
            <Text style={[tema.typography.title, { color: tema.colors.textPrimary }]} numberOfLines={2}>
              {vaga.titulo}
            </Text>
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]} numberOfLines={1}>
              {empresaNome}
            </Text>
            <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{local ? `${local} · ${modalidade}` : modalidade}</Text>
            {publicoAlvoLabel ? <Etiqueta variant="info">{publicoAlvoLabel}</Etiqueta> : null}
          </Cartao>
        </Pressable>
      </View>
    );
  }

  // O autor pode vir em `usuario` ou `autor` (ver `feed/types.ts`).
  const postagem = item as Postagem;
  const autor = postagem.usuario ?? postagem.autor;
  const data = formatarDataPorExtenso(postagem.criadoEm);
  const texto = postagem.conteudo?.trim() || "Publicação sem texto";
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={() => onAbrirPostagem(postagem.id)}
        accessibilityRole="button"
        accessibilityLabel={`Publicação de ${autor?.nome ?? "alguém"}: ${texto}`}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ gap: 2 }}>
          {autor?.nome ? (
            <Text style={[tema.typography.bodySmall, { color: tema.colors.textSecondary }]} numberOfLines={1}>
              {autor.nome}
            </Text>
          ) : null}
          <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={2}>
            {texto}
          </Text>
          {data ? <Text style={[tema.typography.caption, { color: tema.colors.textMuted }]}>{data}</Text> : null}
        </Cartao>
      </Pressable>
    </View>
  );
}

/** Linha simples (avatar, título e subtítulo opcional), com o mesmo formato para usuários e empresas. */
function ItemLinha({
  tema,
  titulo,
  fotoUrl,
  subtitulo,
  rotulo,
  onPress,
}: {
  tema: Tema;
  titulo: string;
  fotoUrl?: string | null;
  subtitulo: string | null;
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <View style={{ borderRadius: tema.radius.lg, overflow: "hidden" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        android_ripple={{ color: tema.colors.divider }}
        style={{ minHeight: tema.sizes.touchTarget }}
      >
        <Cartao elevacao="sm" style={{ flexDirection: "row", alignItems: "center", gap: tema.spacing.sm }}>
          <Avatar nome={titulo} fotoUrl={fotoUrl} size="medium" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[tema.typography.body, { color: tema.colors.textPrimary }]} numberOfLines={1}>
              {titulo}
            </Text>
            {subtitulo ? (
              <Text style={[tema.typography.caption, { color: tema.colors.textSecondary }]} numberOfLines={1}>
                {subtitulo}
              </Text>
            ) : null}
          </View>
        </Cartao>
      </Pressable>
    </View>
  );
}
