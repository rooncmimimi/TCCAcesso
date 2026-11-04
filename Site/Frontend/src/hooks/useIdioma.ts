import { useContext } from "react";

import { IdiomaContext } from "@/contexts/IdiomaContext";

/** O idioma do site e a função `t` que traduz os textos dele. Funciona sem provedor (português). */
export function useIdioma() {
  return useContext(IdiomaContext);
}
