import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { preferencias } = vi.hoisted(() => ({
  preferencias: { readingRuler: true, rulerHeight: 64, rulerDim: 0.6, reduceMotion: false },
}));

vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias }) }));

const { ReguaDeLeitura, PASSO_DA_REGUA } = await import("./ReguaDeLeitura");

const regua = () => document.querySelector<HTMLElement>("[data-regua-de-leitura]");
/** Onde a faixa clara começa e termina, lido do gradiente. */
const faixa = () => {
  const m = /transparent (-?[\d.]+)px, transparent (-?[\d.]+)px/.exec(regua()!.style.background);
  return m ? { topo: Number(m[1]), base: Number(m[2]) } : null;
};

function mover(clientY: number) {
  act(() => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientY }));
  });
}

function comCaixa(el: HTMLElement, top: number, height: number) {
  el.getBoundingClientRect = () => ({ top, height, width: 100, bottom: top + height, left: 0, right: 100, x: 0, y: top, toJSON: () => ({}) });
}

beforeEach(() => {
  preferencias.readingRuler = true;
  preferencias.rulerHeight = 64;
  preferencias.rulerDim = 0.6;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("ReguaDeLeitura", () => {
  it("desligada, não desenha nada nem escuta o mouse", () => {
    preferencias.readingRuler = false;
    render(<ReguaDeLeitura />);

    expect(regua()).toBeNull();
  });

  it("não bloqueia cliques, não é lida por leitor de tela e fica abaixo de diálogos e avisos", () => {
    render(<ReguaDeLeitura />);

    expect(regua()!.getAttribute("aria-hidden")).toBe("true");
    expect(regua()!.className).toContain("pointer-events-none");
    // z-40: abaixo dos diálogos (z-50) e do controle de leitura (z-[60]).
    expect(regua()!.className).toContain("z-40");
  });

  it("começa no meio da tela e segue o mouse", () => {
    render(<ReguaDeLeitura />);
    expect(faixa()).toEqual({ topo: 368, base: 432 }); // 400 ± 32

    mover(300);
    expect(faixa()).toEqual({ topo: 268, base: 332 });
  });

  it("respeita a altura escolhida e escurece o resto conforme a preferência", () => {
    preferencias.rulerHeight = 100;
    preferencias.rulerDim = 0.4;
    render(<ReguaDeLeitura />);
    mover(300);

    expect(faixa()).toEqual({ topo: 250, base: 350 });
    expect(regua()!.style.background).toContain("rgba(0, 0, 0, 0.4)");
  });

  it("valores corrompidos caem nos limites, sem quebrar o desenho", () => {
    preferencias.rulerHeight = Number.NaN;
    preferencias.rulerDim = 7;
    render(<ReguaDeLeitura />);
    mover(300);

    expect(faixa()).toEqual({ topo: 268, base: 332 }); // 64 de altura
    expect(regua()!.style.background).toContain("0.85");
  });

  it("vai para o centro do elemento que recebe foco", () => {
    render(
      <>
        <ReguaDeLeitura />
        <button id="b">Salvar</button>
      </>,
    );
    const botao = document.getElementById("b")!;
    comCaixa(botao, 100, 40); // centro em 120
    act(() => botao.focus());

    expect(faixa()).toEqual({ topo: 88, base: 152 });
  });

  it("cresce para nunca esconder um elemento focado mais alto que a faixa", () => {
    render(
      <>
        <ReguaDeLeitura />
        <textarea id="t" aria-label="Texto" />
      </>,
    );
    const area = document.getElementById("t")!;
    comCaixa(area, 200, 200); // centro em 300, 200 de altura
    act(() => area.focus());

    const { topo, base } = faixa()!;
    expect(topo).toBeLessThanOrEqual(200);
    expect(base).toBeGreaterThanOrEqual(400);
  });

  it("Alt + ↓ e Alt + ↑ movem a faixa de passo em passo e seguram a rolagem", () => {
    render(<ReguaDeLeitura />);
    mover(300);

    const desce = new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(desce);
    });
    expect(desce.defaultPrevented).toBe(true);
    expect(faixa()).toEqual({ topo: 268 + PASSO_DA_REGUA, base: 332 + PASSO_DA_REGUA });

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }));
    });
    expect(faixa()).toEqual({ topo: 268, base: 332 });
  });

  it("a faixa não sai da tela com Alt + setas", () => {
    render(<ReguaDeLeitura />);
    mover(10);

    for (let i = 0; i < 5; i++) {
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }));
      });
    }

    expect(faixa()!.topo).toBe(0); // centro preso em 0, topo limitado a 0
  });

  it("as setas sozinhas, ou com outras teclas, continuam rolando a página", () => {
    render(<ReguaDeLeitura />);
    mover(300);

    for (const opcoes of [{}, { ctrlKey: true }, { shiftKey: true }, { altKey: true, shiftKey: true }]) {
      const evento = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true, ...opcoes });
      act(() => {
        document.dispatchEvent(evento);
      });
      expect(evento.defaultPrevented).toBe(false);
    }
    expect(faixa()).toEqual({ topo: 268, base: 332 });
  });

  it("acompanha o bloco marcado pelo cursor de leitura (data-speaking)", async () => {
    render(
      <>
        <ReguaDeLeitura />
        <p id="p">Bloco lido</p>
      </>,
    );
    const bloco = document.getElementById("p")!;
    comCaixa(bloco, 500, 20); // centro em 510

    act(() => bloco.setAttribute("data-speaking", "true"));

    await waitFor(() => expect(faixa()).toEqual({ topo: 478, base: 542 }));
  });

  it("o mouse assume de novo depois do teclado", () => {
    render(
      <>
        <ReguaDeLeitura />
        <button id="b">Botão</button>
      </>,
    );
    const botao = document.getElementById("b")!;
    comCaixa(botao, 100, 40);
    act(() => botao.focus());
    mover(600);

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(faixa()).toEqual({ topo: 568, base: 632 }); // não volta para o botão
  });

  it("a página rolando leva a faixa junto com o elemento que ela seguia", () => {
    render(
      <>
        <ReguaDeLeitura />
        <button id="b">Botão</button>
      </>,
    );
    const botao = document.getElementById("b")!;
    comCaixa(botao, 100, 40);
    act(() => botao.focus());

    comCaixa(botao, 300, 40); // a página rolou
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(faixa()).toEqual({ topo: 288, base: 352 });
  });

  it("ao desligar, remove a faixa e os ouvintes", () => {
    const { rerender } = render(<ReguaDeLeitura />);
    expect(regua()).not.toBeNull();

    preferencias.readingRuler = false;
    rerender(<ReguaDeLeitura />);

    expect(regua()).toBeNull();
    expect(() => mover(100)).not.toThrow();
  });
});
