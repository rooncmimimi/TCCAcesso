import { ehCorHex, razaoDeContraste } from "@/lib/contraste";

/**
 * Conta de cor em OKLCH, para os ajustes da personalização visual.
 *
 * Por que OKLCH e não RGB: em OKLCH as três coordenadas são a claridade (`l`), o quanto a cor é
 * colorida (`c`) e o matiz (`h`). Mexer em uma não estraga as outras — clarear não acinzenta, e
 * tirar cor não escurece. Em RGB, qualquer ajuste mexe nas três de uma vez.
 *
 * Funções puras, só com `#rrggbb` na entrada e na saída: é o formato que o resto do projeto usa
 * (`ehCorHex`) e o único que chega ao CSS, o que impede uma preferência de carregar CSS arbitrário.
 *
 * As matrizes são as da definição do OKLab (Björn Ottosson). O teste confere ida e volta contra
 * valores conhecidos e contra a conta do próprio navegador.
 */

export type Oklch = { l: number; c: number; h: number };

/** Texto quase preto usado quando o preenchimento é claro. Não é #000 puro: preto puro "vibra". */
export const TEXTO_ESCURO = "#121212";
export const TEXTO_CLARO = "#ffffff";

const deGama = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const paraGama = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055);
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function hexParaOklch(hex: string): Oklch {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = deGama(((n >> 16) & 0xff) / 255);
  const g = deGama(((n >> 8) & 0xff) / 255);
  const b = deGama((n & 0xff) / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const h = (Math.atan2(B, A) * 180) / Math.PI;

  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

export function oklchParaHex({ l, c, h }: Oklch): string {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const canais = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];

  // Fora da faixa do monitor, a cor é cortada para a borda do que dá para mostrar. É o que o
  // navegador também faz; o importante é o resultado continuar sendo uma cor válida.
  return `#${canais
    .map((v) => Math.round(limitar(paraGama(v), 0, 1) * 255))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Mistura duas cores em OKLCH, pelo caminho mais curto do matiz: 0 devolve `de`, 1 devolve `para`.
 * É o que a "intensidade da adaptação" usa — o quanto a cor do padrão substitui a cor da marca.
 */
export function misturar(de: string, para: string, quanto: number): string {
  const a = hexParaOklch(de);
  const b = hexParaOklch(para);
  const t = limitar(quanto, 0, 1);

  // Matiz é circular: de 350° para 10° o caminho curto passa pelo zero, não pelos 340° do meio.
  let diferenca = b.h - a.h;
  if (diferenca > 180) diferenca -= 360;
  if (diferenca < -180) diferenca += 360;

  return oklchParaHex({
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: (a.h + diferenca * t + 360) % 360,
  });
}

/**
 * Aplica os ajustes de preferência: `saturacao` e `brilho` são multiplicadores (1 = como está).
 * A claridade fica entre 0,1 e 0,97 porque fora disso a cor vira preto ou branco e perde o matiz.
 */
export function ajustar(hex: string, { saturacao = 1, brilho = 1 }: { saturacao?: number; brilho?: number }): string {
  const cor = hexParaOklch(hex);

  return oklchParaHex({
    l: limitar(cor.l * brilho, 0.1, 0.97),
    c: limitar(cor.c * saturacao, 0, 0.37),
    h: cor.h,
  });
}

/** Entre o texto claro e o escuro, o que enxerga melhor em cima deste preenchimento. */
export function melhorTexto(fundo: string): string {
  return razaoDeContraste(fundo, TEXTO_CLARO) >= razaoDeContraste(fundo, TEXTO_ESCURO)
    ? TEXTO_CLARO
    : TEXTO_ESCURO;
}

/**
 * Empurra a claridade do preenchimento até o par fundo/texto alcançar o contraste pedido.
 *
 * É a trava que deixa os ajustes serem livres: por mais que a pessoa clareie, escureça ou tire a
 * cor, o texto em cima continua legível. Anda em passos pequenos, para o lado que afasta do texto,
 * e desiste depois de 60 passos (cor tão extrema que já é preta ou branca).
 */
export function garantirContraste(fundo: string, texto: string, minimo = 4.5): string {
  if (razaoDeContraste(fundo, texto) >= minimo) return fundo;

  const paraEscuro = hexParaOklch(texto).l > 0.5;
  const cor = hexParaOklch(fundo);

  for (let passo = 1; passo <= 60; passo += 1) {
    const l = limitar(cor.l + (paraEscuro ? -0.01 : 0.01) * passo, 0, 1);
    const candidato = oklchParaHex({ ...cor, l });

    if (razaoDeContraste(candidato, texto) >= minimo) return candidato;
  }

  // Nem preto nem branco bastaram: devolve o extremo, que é o melhor possível.
  return oklchParaHex({ ...cor, l: paraEscuro ? 0 : 1 });
}

/**
 * O par final de uma cor de estado: aplica os ajustes, escolhe o texto que enxerga melhor e
 * garante o contraste mínimo. Uma cor inválida devolve o par original, sem ajuste nenhum.
 */
export function parLegivel(
  fundo: string,
  ajustes: { saturacao?: number; brilho?: number; contrasteMinimo?: number } = {},
): { fundo: string; texto: string } {
  if (!ehCorHex(fundo)) return { fundo, texto: TEXTO_CLARO };

  const ajustado = ajustar(fundo, ajustes);
  const texto = melhorTexto(ajustado);

  return { fundo: garantirContraste(ajustado, texto, ajustes.contrasteMinimo ?? 4.5), texto };
}
