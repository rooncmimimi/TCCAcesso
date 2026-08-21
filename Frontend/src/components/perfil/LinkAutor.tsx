import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "@/contexts/SessionContext";

/**
 * Envolve foto/nome de um autor (postagem, comentário, compartilhamento) com
 * um link para o perfil dele — `/perfil` quando é o próprio usuário logado,
 * `/perfil/:usuarioId` caso contrário. Usado em qualquer lugar que mostre
 * "quem" publicou/comentou/compartilhou algo, para manter esse comportamento
 * consistente em vez de repetir a mesma checagem em cada componente.
 */
export function LinkAutor({
  autorId,
  className,
  children,
}: {
  autorId?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const { user } = useSession();

  if (!autorId) {
    return <span className={className}>{children}</span>;
  }

  const proprio = autorId === user?.id;

  return (
    <Link
      to={proprio ? "/perfil" : "/perfil/$usuarioId"}
      params={proprio ? undefined : { usuarioId: autorId }}
      className={className}
    >
      {children}
    </Link>
  );
}
