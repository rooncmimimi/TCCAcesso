import { useId, useState } from "react";

import type { ChaveBase } from "@/i18n/dicionarios";

/**
 * Os ajustes de cor que uma imagem pode receber na hora de ser vista, e o estado de qual está
 * escolhido. Fica fora do componente porque o componente é só a tela — e porque misturar os dois
 * num arquivo só tira o recarregamento rápido do Vite.
 *
 * O que isto NÃO é está escrito em , junto da tela.
 */
type Ajuste = {
  id: string;
  rotulo: ChaveBase;
  /** `null` = sem filtro: a imagem como ela é. */
  matriz: string | null;
  /** Saturação em vez de matriz (o `feColorMatrix` tem um tipo próprio para isso). */
  saturacao?: number;
};

/**
 * As matrizes de simulação são as de Viénot, Brettel e Mollon, publicadas e usadas por quase toda
 * ferramenta que simula daltonismo. São aproximações, e é assim que a tela as apresenta.
 */
export const AJUSTES: readonly Ajuste[] = [
  { id: "original", rotulo: "acessibilidade.ajusteDeCorDaImagem.original", matriz: null },
  { id: "saturar", rotulo: "acessibilidade.ajusteDeCorDaImagem.maisCor", matriz: null, saturacao: 1.9 },
  {
    id: "cinza",
    rotulo: "acessibilidade.ajusteDeCorDaImagem.semCor",
    matriz: null,
    saturacao: 0,
  },
  {
    id: "protanopia",
    rotulo: "acessibilidade.ajusteDeCorDaImagem.simularProtanopia",
    matriz: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  },
  {
    id: "deuteranopia",
    rotulo: "acessibilidade.ajusteDeCorDaImagem.simularDeuteranopia",
    matriz: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  },
  {
    id: "tritanopia",
    rotulo: "acessibilidade.ajusteDeCorDaImagem.simularTritanopia",
    matriz: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  },
];

export function useAjusteDeCor() {
  const [ajuste, setAjuste] = useState("original");
  const prefixo = useId().replace(/:/g, "");
  const escolhido = AJUSTES.find((a) => a.id === ajuste) ?? AJUSTES[0];
  const temFiltro = escolhido.id !== "original";

  return {
    ajuste,
    setAjuste,
    prefixo,
    /** Vai no `style` da imagem. Vazio quando a pessoa está vendo o original. */
    estilo: temFiltro ? { filter: `url(#${prefixo}-${escolhido.id})` } : undefined,
    temFiltro,
  };
}

