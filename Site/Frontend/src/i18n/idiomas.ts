/**
 * Os idiomas do Site e o que se sabe de cada um. Um código só (`pt`, `en`, `es`) em todo lugar: no dicionário, no
 * `localStorage`, na conta e na API.
 */
export const IDIOMAS = [
  { codigo: "pt", nome: "Português", locale: "pt-BR" },
  { codigo: "en", nome: "English", locale: "en-US" },
  { codigo: "es", nome: "Español", locale: "es-ES" },
] as const;

export type CodigoIdioma = (typeof IDIOMAS)[number]["codigo"];

export const IDIOMA_PADRAO: CodigoIdioma = "pt";

export function ehIdioma(valor: unknown): valor is CodigoIdioma {
  return IDIOMAS.some((idioma) => idioma.codigo === valor);
}

/** O locale BCP 47 que `Intl` e o atributo `lang` usam ("pt-BR", "en-US", "es-ES"). */
export function localeDe(idioma: CodigoIdioma): string {
  return IDIOMAS.find((item) => item.codigo === idioma)?.locale ?? "pt-BR";
}

/** O nome do idioma, escrito nele mesmo ("English", não "Inglês"): quem não lê português precisa reconhecê-lo. */
export function nomeDoIdioma(idioma: CodigoIdioma): string {
  return IDIOMAS.find((item) => item.codigo === idioma)?.nome ?? "Português";
}

/**
 * O idioma que o navegador pede, entre os três que o Site tem. Qualquer outro (francês, alemão) cai no padrão: não finge
 * traduzir para o que não existe.
 */
export function idiomaDoNavegador(preferidos: readonly string[] | undefined = typeof navigator === "undefined" ? undefined : navigator.languages): CodigoIdioma {
  for (const preferido of preferidos ?? []) {
    const base = preferido.toLowerCase().split("-")[0];

    if (ehIdioma(base)) return base;
  }

  return IDIOMA_PADRAO;
}
