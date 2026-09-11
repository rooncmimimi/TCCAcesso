import type { ReactNode } from "react";

import { useAuth } from "../auth";
import { SegurancaContext } from "./SegurancaContext";
import { useBloqueioBiometrico } from "./useBloqueioBiometrico";

/**
 * Uma ÚNICA instância do hook de bloqueio biométrico (Fase 22), compartilhada
 * entre `RootNavigator` (decide SE mostra `BiometricLockScreen`) e a própria
 * `BiometricLockScreen` (chama `desbloquear()`) — precisam ler/escrever o
 * MESMO estado de "já desbloqueou nesta sessão do app", nunca duas cópias
 * independentes (chamar o hook direto em cada um teria exatamente esse bug:
 * a tela autenticaria com sucesso, mas o `RootNavigator` nunca saberia).
 *
 * Precisa vir DENTRO de `AuthProvider` (depende de `useAuth().status`) e
 * FORA de `RootNavigator` (que consome `useSeguranca()`) — ver `App.tsx`.
 */
export function SegurancaProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const valor = useBloqueioBiometrico(status === "authenticated");

  return <SegurancaContext.Provider value={valor}>{children}</SegurancaContext.Provider>;
}
