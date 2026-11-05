import { useContext } from "react";

import { LeituraDestacadaContext } from "@/contexts/LeituraDestacadaContext";

export function useLeituraDestacada() {
  const ctx = useContext(LeituraDestacadaContext);
  if (!ctx) throw new Error("useLeituraDestacada precisa estar dentro de LeituraDestacadaProvider");
  return ctx;
}
