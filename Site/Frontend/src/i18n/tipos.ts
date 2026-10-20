/** Idiomas do Site. O português é a fonte: en e es precisam ter exatamente as mesmas chaves. */
export const IDIOMAS = [
  { codigo: "pt", nome: "Português", locale: "pt-BR", htmlLang: "pt-BR" },
  { codigo: "en", nome: "English", locale: "en-US", htmlLang: "en" },
  { codigo: "es", nome: "Español", locale: "es-ES", htmlLang: "es" },
] as const;

export type Idioma = (typeof IDIOMAS)[number]["codigo"];

export const IDIOMA_PADRAO: Idioma = "pt";

export function ehIdioma(valor: unknown): valor is Idioma {
  return IDIOMAS.some((i) => i.codigo === valor);
}

/** Código de região para `Intl` (datas, moeda, ordenação), conforme o idioma. */
export function localeDoIdioma(idioma: Idioma): string {
  return IDIOMAS.find((i) => i.codigo === idioma)?.locale ?? "pt-BR";
}
