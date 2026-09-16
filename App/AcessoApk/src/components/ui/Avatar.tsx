import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { useTheme } from "../../theme";
import type { Theme } from "../../theme";

export type AvatarSize = "small" | "medium" | "large" | "xlarge";

type AvatarProps = {
  /** Nome completo — vira iniciais quando não há foto (ou a foto falha ao carregar). */
  nome?: string | null;
  /** URL já resolvida pela API (mesmo padrão de `AnexoResumo`/feed: o backend
   * já entrega a URL assinada pronta para uso, nunca um caminho relativo). */
  fotoUrl?: string | null;
  size?: AvatarSize;
  /** Contorno na cor da superfície ao redor — mesmo padrão do Site
   * (`FotoUploader.tsx`: `border-4 border-card`), usado em cabeçalhos de
   * perfil para o avatar "flutuar" sobre uma capa/faixa colorida atrás dele. */
  bordered?: boolean;
};

/**
 * Avatar único do app — substitui as 11 cópias quase idênticas de
 * "círculo com iniciais" espalhadas por tela (Rodada de redesign visual,
 * item 19: "existe duplicação de lógica de iniciais... centralize"). Sempre
 * decorativo (`accessible={false}`): o nome da pessoa já aparece como texto
 * ao lado em todo lugar que usa avatar — o componente nunca deveria ser o
 * único portador do nome acessível (evita duplicar o mesmo "Fulano de Tal"
 * duas vezes seguidas para quem usa leitor de tela).
 *
 * Foto real: o backend já expõe `fotoPerfil` em praticamente todo tipo que
 * representa uma pessoa (feed, vagas, seguidores, mensagens...), mas nenhuma
 * tela renderizava — sempre iniciais, mesmo quando a foto existia. `onError`
 * cai para iniciais em vez de mostrar uma imagem quebrada (item 22 do
 * redesign: "evitar imagens quebradas aparecendo para o usuário").
 */
export function Avatar({ nome, fotoUrl, size = "medium", bordered = false }: AvatarProps) {
  const { theme } = useTheme();
  const [falhouAoCarregar, setFalhouAoCarregar] = useState(false);
  const dimensao = DIMENSAO_POR_TAMANHO[size](theme);
  const mostrarFoto = Boolean(fotoUrl) && !falhouAoCarregar;

  return (
    <View
      accessible={false}
      style={{
        width: dimensao,
        height: dimensao,
        borderRadius: dimensao / 2,
        backgroundColor: theme.colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: bordered ? 3 : 0,
        borderColor: theme.colors.surface,
      }}
    >
      {mostrarFoto ? (
        <Image
          source={{ uri: fotoUrl ?? undefined, cacheKey: fotoUrl ?? undefined }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          onError={() => setFalhouAoCarregar(true)}
        />
      ) : (
        <Text style={[TIPOGRAFIA_POR_TAMANHO[size](theme), { color: theme.colors.primary.onSoft }]}>
          {iniciaisDoNome(nome)}
        </Text>
      )}
    </View>
  );
}

const DIMENSAO_POR_TAMANHO: Record<AvatarSize, (theme: Theme) => number> = {
  small: (theme) => theme.sizes.avatarSmall,
  medium: (theme) => theme.sizes.avatarMedium,
  large: (theme) => theme.sizes.avatarLarge,
  xlarge: (theme) => theme.sizes.avatarXLarge,
};

const TIPOGRAFIA_POR_TAMANHO: Record<AvatarSize, (theme: Theme) => Theme["typography"][keyof Theme["typography"]]> = {
  small: (theme) => theme.typography.caption,
  medium: (theme) => theme.typography.label,
  large: (theme) => theme.typography.title,
  xlarge: (theme) => theme.typography.heading,
};

/** Iniciais de um nome — 1 ou 2 letras (primeiro nome + último, quando há mais de um). */
export function iniciaisDoNome(nome: string | undefined | null): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}
