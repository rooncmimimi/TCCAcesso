import { obterIdioma } from "./estado";
import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import type { Idioma } from "./tipos";

/**
 * O português é a fonte da verdade: o tipo do dicionário sai dele, e `en` e `es` são declarados
 * com esse tipo. Esquecer uma chave (ou errar a assinatura de uma função de texto) numa tradução é
 * erro de compilação, não tela em branco em produção.
 */
export type Dicionario = typeof pt;

export const DICIONARIOS: Record<Idioma, Dicionario> = { pt, en, es };

export function dicionarioDe(idioma: Idioma): Dicionario {
  return DICIONARIOS[idioma];
}

/** Dicionário do idioma atual, para quem está fora de um componente (títulos, avisos, serviços). */
export function dic(): Dicionario {
  return DICIONARIOS[obterIdioma()];
}
