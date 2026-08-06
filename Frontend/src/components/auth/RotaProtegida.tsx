import type { ReactNode } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import type { TipoUsuario } from "@/types";

/** Envolve telas privadas, redirecionando visitantes para `/entrar`. */
export function RotaProtegida({
  children,
  tiposPermitidos,
}: {
  children: ReactNode;
  tiposPermitidos?: TipoUsuario[];
}) {
  const { autorizado, carregando } = useAuthGuard(tiposPermitidos);

  if (carregando) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-sm text-muted-foreground" role="status">
        Carregando…
      </div>
    );
  }

  if (!autorizado) return null;

  return <>{children}</>;
}

export default RotaProtegida;
