import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSessao } from "@/hooks/useSessao";

/**
 * Envolve foto/nome de um autor (postagem, comentário, compartilhamento) com
 * um link para o perfil dele: `/perfil` quando é o próprio usuário logado,
 * `/perfil/:usuarioId` caso contrário. Usado em qualquer lugar que mostre
 * "quem" publicou/comentou/compartilhou algo, para manter esse comportamento
 * consistente em vez de repetir a mesma checagem em cada componente.
 */
export function LinkAutor({
  autorId,
  className,
  children,
  ariaLabel,
}: {
  autorId?: string | null;
  className?: string;
  children: ReactNode;
  /**
   * Necessário quando `children` é só a foto, sem o nome em texto ao lado (por exemplo, "Ver perfil
   * de Maria"). A imagem usa `alt=""` de propósito, para não repetir o nome que costuma aparecer ao
   * lado; quando o link é só a foto, sem este rótulo ele ficaria sem nome acessível depois que a
   * imagem carrega.
   */
  ariaLabel?: string;
}) {
  const { usuario } = useSessao();

  if (!autorId) {
    return <span className={className}>{children}</span>;
  }

  const proprio = autorId === usuario?.id;

  return (
    <Link
      to={proprio ? "/perfil" : "/perfil/$usuarioId"}
      params={proprio ? undefined : { usuarioId: autorId }}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
