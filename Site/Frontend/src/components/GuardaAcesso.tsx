import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { useSessao } from "@/hooks/useSessao";
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
  const { usuario, inicializado, autenticado } = useSessao();

  if (!inicializado) {
    return (
      <EstruturaApp>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          <p>Carregando sua sessão…</p>
        </div>
      </EstruturaApp>
    );
  }

  if (!autenticado || !usuario) {
    return <Navigate to="/entrar" />;
  }

  if (!tipos.includes(usuario.tipo)) {
    return <Navigate to="/feed" />;
  }

  return <>{children}</>;
}
