import { useCallback, useSyncExternalStore } from "react";

import { DICIONARIOS, type Dicionario } from "./dicionario";
import { assinarIdioma, definirIdioma, obterIdioma } from "./estado";
import type { Idioma } from "./tipos";

/** Idioma atual e a função de trocá-lo. O componente se atualiza quando o idioma muda. */
export function useIdioma(): { idioma: Idioma; definir: (novo: Idioma) => void } {
  const idioma = useSyncExternalStore(assinarIdioma, obterIdioma, obterIdioma);
  const definir = useCallback((novo: Idioma) => definirIdioma(novo), []);
  return { idioma, definir };
}

/** Textos do idioma atual: `const t = useT(); t.comum.voltar`. */
export function useT(): Dicionario {
  const { idioma } = useIdioma();
  return DICIONARIOS[idioma];
}
