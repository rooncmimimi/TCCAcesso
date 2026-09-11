import { useContext } from "react";

import { SegurancaContext } from "./SegurancaContext";
import type { EstadoBloqueioBiometrico } from "./useBloqueioBiometrico";

export function useSeguranca(): EstadoBloqueioBiometrico {
  const ctx = useContext(SegurancaContext);
  if (!ctx) throw new Error("useSeguranca precisa estar dentro de SegurancaProvider");
  return ctx;
}
