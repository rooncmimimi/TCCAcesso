import { ehIdioma, type CodigoIdioma } from "./idiomas";

export const CHAVE_IDIOMA = "acesso:idioma";

/** A escolha explícita da pessoa neste aparelho, ou `null` se nunca escolheu (aí vale o idioma do navegador). */
export function lerIdiomaEscolhido(): CodigoIdioma | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_IDIOMA);

    return ehIdioma(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function guardarIdioma(idioma: CodigoIdioma) {
  try {
    window.localStorage.setItem(CHAVE_IDIOMA, idioma);
  } catch {
    // Armazenamento bloqueado: o idioma vale só nesta visita.
  }
}
