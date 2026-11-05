import { useEffect } from "react";

import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useLeituraDestacada } from "@/hooks/useLeituraDestacada";
import { useVoz } from "@/hooks/useVoz";
import { acharParada, listarParadas, raizDaLeitura, setaPertenceAoComponente, type Parada } from "@/lib/cursorDeLeitura";
import { resolverAlvoFalavel } from "@/lib/leitorSemantico";

/**
 * Cursor de leitura: com a leitura por voz e a opção "Navegar pelo conteúdo com as setas" ligadas,
 * ↓ e ↑ percorrem a página bloco a bloco (títulos, parágrafos, itens de lista, imagens, controles),
 * lendo cada um. O Tab continua igual. A regra de não narrar a página sozinha também: a voz só fala
 * o que a pessoa pede com a seta.
 *
 * Duas coisas fazem isto conviver com o resto do Site:
 * - **A seta só é tomada onde não tem outra função.** Em áreas de texto, campos numéricos e de data,
 *   listas de opções e de sugestões, menus, grupos de rádio, controles deslizantes e afins
 *   (`setaPertenceAoComponente`), a tecla segue para o componente. Com Ctrl, Alt, Shift ou Meta,
 *   também. Campo de texto de uma linha não prende o cursor. E com um diálogo aberto o cursor fica
 *   dentro dele (`raizDaLeitura`).
 * - **Controles recebem o foco de verdade; texto não.** Quem fala um controle é a leitura por foco
 *   (`useLeituraAutomatica`), com a mesma frase do Tab, e Enter ou Espaço agem sobre ele. Já o texto
 *   é só marcado na tela (`data-speaking`) e lido aqui; o foco que estava num controle sai dele para
 *   um Enter não acionar, por engano, o botão que ficou para trás.
 *
 * Esc apaga a marcação e para a fala.
 */
export function useCursorDeLeitura() {
  const { preferencias } = useAcessibilidade();
  const { falar, parar } = useVoz();
  const { ler: lerDestacado, parar: pararLeitura } = useLeituraDestacada();
  const ativo = preferencias.screenReader && preferencias.arrowReading;
  const reduzirMovimento = preferencias.reduceMotion;

  useEffect(() => {
    if (!ativo) return;

    /** Onde o cursor está: a última parada lida ou o último controle focado. */
    let atual: HTMLElement | null = null;
    let marcado: HTMLElement | null = null;
    /** A última coisa que o cursor mandou ler foi um bloco com destaque (marcação própria). */
    let lendoPeloCursor = false;

    const desmarcar = () => {
      marcado?.removeAttribute("data-speaking");
      marcado = null;
    };

    const marcar = (el: HTMLElement) => {
      desmarcar();
      el.setAttribute("data-speaking", "true");
      marcado = el;
    };

    const rolarAte = (el: HTMLElement) => {
      el.scrollIntoView?.({ block: "center", behavior: reduzirMovimento ? "auto" : "smooth" });
    };

    const referencia = (raiz: HTMLElement): HTMLElement | null => {
      if (atual?.isConnected && raiz.contains(atual)) return atual;
      const focado = document.activeElement;
      if (focado instanceof HTMLElement && focado !== document.body && raiz.contains(focado)) return focado;
      return null;
    };

    const ir = (parada: Parada) => {
      atual = parada.el;

      if (parada.tipo === "controle") {
        desmarcar();
        parada.el.focus();
        // Controle que não aceita foco (desabilitado, por exemplo): lê aqui, já que o foco não vai.
        if (document.activeElement !== parada.el) {
          marcar(parada.el);
          rolarAte(parada.el);
          falar(parada.fala);
        }
        return;
      }

      const focado = document.activeElement;
      if (focado instanceof HTMLElement && focado !== document.body) focado.blur();
      desmarcar();
      rolarAte(parada.el);

      if (parada.destacavel) {
        // O leitor destacado marca a palavra (ou a frase, ou o bloco) e limpa a marca sozinho.
        lerDestacado(parada.el, { prefixo: parada.prefixo });
        lendoPeloCursor = true;
        return;
      }

      marcar(parada.el);
      falar(parada.fala);
    };

    const mover = (direcao: 1 | -1) => {
      const raiz = raizDaLeitura();
      const proxima = acharParada(listarParadas(raiz), referencia(raiz), direcao);
      if (proxima) ir(proxima);
      else falar(direcao === 1 ? "Fim da página." : "Início da página.");
    };

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      if (e.key === "Escape") {
        if (marcado || lendoPeloCursor) {
          desmarcar();
          pararLeitura();
          parar();
          lendoPeloCursor = false;
        }
        return;
      }

      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (setaPertenceAoComponente(e.target)) return;

      // A tecla é do cursor: tira da página (rolagem) e dos componentes. Sem o `stopPropagation`, o
      // seletor do Radix (idioma, estado) abriria com a mesma tecla que o cursor acabou de usar.
      e.preventDefault();
      e.stopPropagation();
      mover(e.key === "ArrowDown" ? 1 : -1);
    };

    // Tab, clique ou qualquer outro foco também move o cursor: a seta seguinte continua dali.
    const aoFocar = (e: FocusEvent) => {
      const el = resolverAlvoFalavel(e.target);
      if (!el) return;
      atual = el;
      if (marcado && marcado !== el) desmarcar();
    };

    // `capture: true`: o cursor decide antes dos componentes. Os que têm seta própria (listas,
    // menus, campos com sugestões) já foram separados por `setaPertenceAoComponente`, e os demais,
    // como o botão do seletor do Radix, abririam com ↓ antes de o cursor poder usar a tecla.
    document.addEventListener("keydown", aoTeclar, true);
    document.addEventListener("focusin", aoFocar);

    return () => {
      document.removeEventListener("keydown", aoTeclar, true);
      document.removeEventListener("focusin", aoFocar);
      desmarcar();
    };
  }, [ativo, reduzirMovimento, falar, parar, lerDestacado, pararLeitura]);
}
