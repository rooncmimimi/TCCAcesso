import { useContext } from "react";

import { SessaoContext } from "@/contexts/SessaoContext";

export function useSessao() {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao precisa estar dentro de SessaoProvider");
  return ctx;
}
