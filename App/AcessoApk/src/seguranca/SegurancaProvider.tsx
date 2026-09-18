import type { ReactNode } from "react";

import { useAutenticacao } from "../autenticacao";
import { SegurancaContext } from "./SegurancaContext";
import { useBloqueioBiometrico } from "./useBloqueioBiometrico";

/**
 * Única instância do bloqueio biométrico, compartilhada pelo `RaizNavigator` (decide se mostra a
 * tela de desbloqueio) e pela `BloqueioBiometricoScreen` (chama `desbloquear()`). Se cada um
 * chamasse o hook, a tela desbloquearia a própria cópia do estado e o navegador nunca saberia.
 *
 * Fica dentro do `AutenticacaoProvider`, porque depende da sessão, e fora do `RaizNavigator` (ver
 * `App.tsx`).
 */
export function SegurancaProvider({ children }: { children: ReactNode }) {
  const { status } = useAutenticacao();
  const valor = useBloqueioBiometrico(status === "autenticado");

  return <SegurancaContext.Provider value={valor}>{children}</SegurancaContext.Provider>;
}
