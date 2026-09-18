import { useContext } from "react";

import { AutenticacaoContext, type AutenticacaoContextValue } from "./AutenticacaoContext";

export function useAutenticacao(): AutenticacaoContextValue {
  const ctx = useContext(AutenticacaoContext);
  if (!ctx) throw new Error("useAutenticacao precisa estar dentro de AutenticacaoProvider");
  return ctx;
}
