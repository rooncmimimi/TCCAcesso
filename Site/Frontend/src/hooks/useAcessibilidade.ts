import { useContext } from "react";

import { AcessibilidadeContext } from "@/contexts/AcessibilidadeContext";

export function useAcessibilidade() {
  const ctx = useContext(AcessibilidadeContext);
  if (!ctx) throw new Error("useAcessibilidade precisa estar dentro de AcessibilidadeProvider");
  return ctx;
}
