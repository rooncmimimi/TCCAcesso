import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import { useSession } from "@/contexts/SessionContext";
import type { TipoUsuario } from "@/types";

/**
 * Restringe o acesso a uma rota conforme o tipo de usuário autenticado.
 * Enquanto a sessão não é hidratada, mostra um estado de carregamento
 * acessível; usuários sem permissão são redirecionados para `/feed`.
 */
export function GuardaAcesso({
  tipos,
  children,
}: {
  tipos: TipoUsuario[];
  children: ReactNode;
}) {
  const { user, hydrated, autenticado } = useSession();

  if (!hydrated) {
    return (
      <AppShell>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          <p>Carregando sua sessão…</p>
        </div>
      </AppShell>
    );
  }

  if (!autenticado || !user) {
    return <Navigate to="/entrar" />;
  }

  if (!tipos.includes(user.tipo)) {
    return <Navigate to="/feed" />;
  }

  return <>{children}</>;
}
