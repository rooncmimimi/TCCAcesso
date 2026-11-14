/**
 * Hachuras das séries de gráfico: a textura que faz uma fatia se distinguir da outra **sem
 * depender da cor**.
 *
 * É o que sustenta o padrão monocromático, onde a cor não distingue nada, e o que salva qualquer
 * gráfico impresso em preto e branco ou visto por quem confunde justamente aqueles dois matizes.
 *
 * Cada série é uma `<pattern>` de SVG que pinta a cor da série (`var(--chart-N)`, que o padrão
 * visual escolhido redefine) e desenha a textura por cima, com a cor de `--hachura` — clara no tema
 * escuro e escura no tema claro, para aparecer nos dois.
 */

export type Hachura = {
  /** O desenho em cima da cor. `vazio` é a série sólida: sem textura, a mais fácil de ler. */
  tipo: "vazio" | "diagonal" | "pontos" | "cruzada" | "horizontal";
  /** Graus de rotação do azulejo. Duas diagonais com ângulos diferentes já se separam. */
  giro: number;
};

/** Cinco séries, cinco texturas diferentes, na ordem de `--chart-1` a `--chart-5`. */
export const HACHURAS: readonly Hachura[] = [
  { tipo: "vazio", giro: 0 },
  { tipo: "diagonal", giro: 45 },
  { tipo: "pontos", giro: 0 },
  { tipo: "cruzada", giro: 0 },
  { tipo: "horizontal", giro: 0 },
];

/** O id de uma hachura dentro de um gráfico. O prefixo vem do `useId`, porque pode haver dois na tela. */
export function idDaHachura(prefixo: string, indice: number): string {
  return `${prefixo}-hachura-${(indice % HACHURAS.length) + 1}`;
}

/** O que vai no `fill` da barra ou da fatia. */
export function preenchimentoDaSerie(prefixo: string, indice: number): string {
  return `url(#${idDaHachura(prefixo, indice)})`;
}
