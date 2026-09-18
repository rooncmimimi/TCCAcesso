import { useContext } from "react";

import { AcessibilidadeContext } from "./AcessibilidadeContext";
import type { AcessibilidadeContextValue } from "./types";

export function useAcessibilidade(): AcessibilidadeContextValue {
  const ctx = useContext(AcessibilidadeContext);
  if (!ctx) throw new Error("useAcessibilidade precisa estar dentro de AcessibilidadeProvider");
  return ctx;
}
