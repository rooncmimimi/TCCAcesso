import type { ReactNode } from "react";

import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";
import { montarFrase } from "@/i18n/montarFrase";
import type { Variaveis } from "@/i18n/traduzir";

/**
 * Uma frase que tem link, negrito ou um valor destacado NO MEIO, sem partir a frase em pedaços.
 *
 * O problema: `Abra uma <Link>vaga</Link> para se candidatar` escrito direto no JSX são três textos
 * separados, e a ordem das palavras muda entre os idiomas — em inglês o link cai em outro lugar da frase.
 * Traduzir cada pedaço sozinho produz frase torta, e quem lê não tem como adivinhar a intenção.
 *
 * A solução: a frase inteira mora numa chave só, com marcas numeradas, e quem renderiza diz o que cada
 * marca é. Quem traduz pode mover a marca para onde a frase pedir no idioma dela.
 *
 *     // pt: "Abra uma <1>vaga</1> para se candidatar."
 *     // en: "To apply, open a <1>job</1>."
 *     <Frase chave="simulador.abraUmaVaga" partes={[(texto) => <Link to="/vagas">{texto}</Link>]} />
 */
export function Frase({
  chave,
  vars,
  partes,
}: {
  chave: ChaveBase;
  vars?: Variaveis;
  /** Uma função por marca, na ordem: `partes[0]` recebe o texto de `<1>`, `partes[1]` o de `<2>`. */
  partes: readonly ((texto: string) => ReactNode)[];
}) {
  const { t } = useIdioma();

  return <>{montarFrase(t(chave, vars), partes)}</>;
}
