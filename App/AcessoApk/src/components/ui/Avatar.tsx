import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { useTema } from "../../tema";
import type { Tema } from "../../tema";

export type TamanhoAvatar = "small" | "medium" | "large" | "xlarge";

type AvatarProps = {
  /** Nome completo: vira iniciais quando não há foto (ou a foto falha ao carregar). */
  nome?: string | null;
  /** URL pronta, entregue pela API; nunca um caminho relativo. */
  fotoUrl?: string | null;
  size?: TamanhoAvatar;
  /** Contorno na cor da superfície ao redor: mesmo padrão do Site
   * (`FotoUploader.tsx`: `border-4 border-card`), usado em cabeçalhos de
   * perfil para o avatar "flutuar" sobre uma capa/faixa colorida atrás dele. */
  comBorda?: boolean;
};

/**
 * Avatar do app: mostra a foto quando existe e as iniciais quando não há foto ou ela falha ao
 * carregar, para nunca exibir imagem quebrada.
 *
 * É sempre decorativo (`accessible={false}`): o nome da pessoa já aparece como texto ao lado em
 * todo lugar que usa avatar, e repeti-lo faria o leitor de tela ler o nome duas vezes.
 */
export function Avatar({ nome, fotoUrl, size = "medium", comBorda = false }: AvatarProps) {
  const { tema } = useTema();
  const [falhouAoCarregar, setFalhouAoCarregar] = useState(false);
  const dimensao = DIMENSAO_POR_TAMANHO[size](tema);
  const mostrarFoto = Boolean(fotoUrl) && !falhouAoCarregar;

  return (
    <View
      accessible={false}
      style={{
        width: dimensao,
        height: dimensao,
        borderRadius: dimensao / 2,
        backgroundColor: tema.colors.primary.soft,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: comBorda ? 3 : 0,
        borderColor: tema.colors.surface,
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
        <Text style={[TIPOGRAFIA_POR_TAMANHO[size](tema), { color: tema.colors.primary.onSoft }]}>
          {iniciaisDoNome(nome)}
        </Text>
      )}
    </View>
  );
}

const DIMENSAO_POR_TAMANHO: Record<TamanhoAvatar, (tema: Tema) => number> = {
  small: (tema) => tema.sizes.avatarSmall,
  medium: (tema) => tema.sizes.avatarMedium,
  large: (tema) => tema.sizes.avatarLarge,
  xlarge: (tema) => tema.sizes.avatarXLarge,
};

const TIPOGRAFIA_POR_TAMANHO: Record<TamanhoAvatar, (tema: Tema) => Tema["typography"][keyof Tema["typography"]]> = {
  small: (tema) => tema.typography.caption,
  medium: (tema) => tema.typography.label,
  large: (tema) => tema.typography.title,
  xlarge: (tema) => tema.typography.heading,
};

/** Iniciais de um nome: 1 ou 2 letras (primeiro nome + último, quando há mais de um). */
export function iniciaisDoNome(nome: string | undefined | null): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]?.charAt(0) ?? "" : "";
  const iniciais = (primeira + ultima).toUpperCase();
  return iniciais || "?";
}
