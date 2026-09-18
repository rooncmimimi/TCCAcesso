import { useContext } from "react";

import { VozContext } from "@/contexts/VozContext";

export function useVoz() {
  const ctx = useContext(VozContext);
  if (!ctx) throw new Error("useVoz precisa estar dentro de VozProvider");
  return ctx;
}
