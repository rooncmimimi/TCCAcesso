import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/contexts/SessionContext";
import type { TipoUsuario } from "@/types";

/**
 * Protege telas privadas: redireciona para `/entrar` quando não autenticado
 * e, opcionalmente, exige um dos tipos de usuário informados.
 */
export function useAuthGuard(tiposPermitidos?: TipoUsuario[]) {
  const { user, hydrated, autenticado } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;

    if (!autenticado) {
      navigate({ to: "/entrar" });
      return;
    }

    if (tiposPermitidos && user && !tiposPermitidos.includes(user.tipo)) {
      navigate({ to: "/feed" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, autenticado, user?.tipo]);

  return {
    usuario: user,
    carregando: !hydrated,
    autorizado: hydrated && autenticado && (!tiposPermitidos || (user && tiposPermitidos.includes(user.tipo))),
  };
}

export default useAuthGuard;
