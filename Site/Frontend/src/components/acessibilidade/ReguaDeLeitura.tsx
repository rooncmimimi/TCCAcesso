import { useEffect, useRef, useState } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";

/** Passo, em pixels, de cada Alt + seta. */
export const PASSO_DA_REGUA = 24;

/**
 * Régua de leitura: uma faixa clara que acompanha a posição de leitura, com o resto da tela
 * escurecido. A posição vem de três fontes, a mais recente vence:
 * - o **mouse** (ou o toque), por `pointermove`;
 * - o **foco** do teclado e a marca do cursor de leitura (`data-speaking`): a régua vai para o
 *   centro do elemento, então Tab e setas de leitura levam a régua junto;
 * - **Alt + ↑ / Alt + ↓**, que sobem e descem a régua de `PASSO_DA_REGUA` em `PASSO_DA_REGUA`.
 *   As setas sozinhas continuam rolando a página (ou sendo do cursor de leitura).
 *
 * O que ela não faz, de propósito:
 * - não rola a página, não captura cliques (`pointer-events: none`) e não toma o foco;
 * - não escurece nada que fique acima dela: diálogos e avisos têm `z-index` maior;
 * - não anima: a faixa muda de posição e pronto, então movimento reduzido já é respeitado.
 *
 * O elemento em foco nunca fica escondido: a faixa clara é centrada nele e, se ele for mais alto
 * que a faixa, a faixa cresce para cobri-lo.
 */
export function ReguaDeLeitura() {
  const { preferencias } = useAcessibilidade();
  const { readingRuler, rulerHeight, rulerDim } = preferencias;
  const [y, setY] = useState<number | null>(null);
  const [alturaDoFoco, setAlturaDoFoco] = useState(0);
  const quadroRef = useRef<number | null>(null);
  /** O elemento que levou a régua pela última vez, para acompanhá-lo quando a página rola. */
  const seguindoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!readingRuler) return;

    // Uma atualização por quadro: `pointermove` dispara várias vezes entre dois desenhos.
    const agendar = (novoY: number, alturaDoElemento = 0) => {
      if (quadroRef.current !== null) cancelAnimationFrame(quadroRef.current);
      quadroRef.current = requestAnimationFrame(() => {
        quadroRef.current = null;
        setY(novoY);
        setAlturaDoFoco(alturaDoElemento);
      });
    };

    const irParaElemento = (el: Element | null) => {
      if (!(el instanceof HTMLElement) || el === document.body) return;
      const caixa = el.getBoundingClientRect();
      if (caixa.height === 0 && caixa.width === 0) return;
      seguindoRef.current = el;
      agendar(caixa.top + caixa.height / 2, caixa.height);
    };

    const aoMover = (e: PointerEvent) => {
      seguindoRef.current = null; // o mouse assume
      agendar(e.clientY);
    };
    const aoFocar = (e: FocusEvent) => irParaElemento(e.target as Element);
    // A página rolou (setas, PageDown, o próprio foco): a régua continua no elemento que seguia.
    const aoRolar = () => {
      if (seguindoRef.current?.isConnected) irParaElemento(seguindoRef.current);
    };

    const aoTeclar = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      seguindoRef.current = null; // o teclado assume a posição
      setY((atual) => {
        const base = atual ?? window.innerHeight / 2;
        const proximo = base + (e.key === "ArrowDown" ? PASSO_DA_REGUA : -PASSO_DA_REGUA);
        return Math.min(Math.max(proximo, 0), window.innerHeight);
      });
      setAlturaDoFoco(0);
    };

    // A marca do cursor de leitura (`data-speaking`) também leva a régua, sem foco de teclado.
    const observador = new MutationObserver((mutacoes) => {
      for (const m of mutacoes) {
        if (m.type === "attributes" && m.attributeName === "data-speaking" && m.target instanceof HTMLElement) {
          if (m.target.getAttribute("data-speaking") === "true") irParaElemento(m.target);
        }
      }
    });
    observador.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-speaking"] });

    window.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("scroll", aoRolar, { passive: true });
    document.addEventListener("focusin", aoFocar);
    document.addEventListener("keydown", aoTeclar);

    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("scroll", aoRolar);
      document.removeEventListener("focusin", aoFocar);
      document.removeEventListener("keydown", aoTeclar);
      observador.disconnect();
      if (quadroRef.current !== null) cancelAnimationFrame(quadroRef.current);
    };
  }, [readingRuler]);

  if (!readingRuler) return null;

  // Sem posição ainda (ninguém mexeu o mouse nem focou nada): a faixa começa no meio da tela.
  const centro = y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 300);
  // Valor corrompido no localStorage não pode quebrar o desenho: cai nos limites do painel.
  const alturaDaRegua = Number.isFinite(rulerHeight) ? Math.min(Math.max(rulerHeight, 24), 160) : 64;
  const escurecimento = Number.isFinite(rulerDim) ? Math.min(Math.max(rulerDim, 0.2), 0.85) : 0.6;
  const altura = Math.max(alturaDaRegua, alturaDoFoco + 16);
  const topo = Math.max(centro - altura / 2, 0);
  const base = topo + altura;
  const escuro = `rgb(0 0 0 / ${escurecimento})`;

  return (
    <div
      aria-hidden="true"
      data-regua-de-leitura=""
      className="pointer-events-none fixed inset-0 z-40"
      // Sem transição: o gradiente se redesenha a cada quadro e nunca anima, nem com movimento normal.
      style={{
        background: `linear-gradient(to bottom, ${escuro} 0, ${escuro} ${topo}px, transparent ${topo}px, transparent ${base}px, ${escuro} ${base}px, ${escuro} 100%)`,
      }}
    />
  );
}
