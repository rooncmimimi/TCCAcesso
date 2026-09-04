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
  ariaLabel,
}: {
  autorId?: string | null;
  className?: string;
  children: ReactNode;
  /**
   * Necessário quando `children` é só a foto (sem o nome como texto ao
   * lado) — ex.: "Ver perfil de Maria." Sem isso, uma vez que a foto
   * termina de carregar, o link fica sem nome acessível nenhum (a imagem
   * é `alt=""` de propósito, pra não duplicar o nome que já aparece como
   * texto ao lado — mas quando o link É só a foto, precisa do rótulo).
   */
  ariaLabel?: string;
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
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
