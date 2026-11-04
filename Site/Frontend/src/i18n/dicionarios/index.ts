import type { CodigoIdioma } from "../idiomas";
import { en } from "./en";
import { es } from "./es";
import { pt, type ChaveDeTexto } from "./pt";

export type { ChaveDeTexto };

export const DICIONARIOS: Record<CodigoIdioma, Readonly<Record<ChaveDeTexto, string>>> = { pt, en, es };

/** Chaves que não têm versão própria (`x_um` e `x_outros` contam como `x`), para `t("x", { n })` aceitar a base. */
export type ChaveBase = ChaveDeTexto extends infer C ? (C extends `${infer B}_um` | `${infer B}_outros` ? B : C) : never;
