import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDitado } from "@/hooks/useDitado";

/**
 * O ditado contra o que o navegador faz DE VERDADE, não contra o caminho feliz.
 *
 * O Chrome encerra a escuta sozinho depois de alguns segundos de silêncio (mesmo com `continuous = true`), às
 * vezes termina sem resultado e sem erro, e nem todo navegador dispara `onend` depois de um erro. Cada um
 * destes casos chega à pessoa como "o ditado não funciona".
 */

class ReconhecimentoFalso {
  static instancias: ReconhecimentoFalso[] = [];
  static get ultimo() {
    return ReconhecimentoFalso.instancias[ReconhecimentoFalso.instancias.length - 1] ?? null;
  }
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  /** Liga o caso em que `start()` estoura (sessão anterior ainda viva no navegador). */
  static falhaAoIniciar = false;
  start = vi.fn(() => {
    if (ReconhecimentoFalso.falhaAoIniciar) throw new Error("InvalidStateError");
  });
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    ReconhecimentoFalso.instancias.push(this);
  }
  /** O navegador reconheceu uma frase. */
  ouviu(texto: string, final = true) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: texto } }] });
  }
  /** O Chrome encerra a sessão sozinho (silêncio, fim de turno). */
  encerrouSozinho() {
    this.onend?.();
  }
  falhou(erro: string, comFim = true) {
    this.onerror?.({ error: erro });
    if (comFim) this.onend?.();
  }
}

type Ditado = ReturnType<typeof useDitado>;

let ditado: Ditado;

function Sonda() {
  ditado = useDitado();
  return null;
}

const montar = () => render(<Sonda />);
const avancar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  ReconhecimentoFalso.instancias = [];
  ReconhecimentoFalso.falhaAoIniciar = false;
  Object.defineProperty(window, "SpeechRecognition", { value: ReconhecimentoFalso, configurable: true });
  Object.defineProperty(window, "speechSynthesis", { value: { cancel: vi.fn(), speaking: false }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
  Reflect.deleteProperty(window, "speechSynthesis");
});

describe("o navegador encerra a escuta sozinho", () => {
  it("continua ouvindo: a pessoa ainda não apertou Parar, então o ditado recomeça", () => {
    montar();
    act(() => ditado.iniciar());

    expect(ditado.ouvindo).toBe(true);
    expect(ReconhecimentoFalso.instancias).toHaveLength(1);

    // Chrome: fim de turno depois de um instante de silêncio, enquanto a pessoa ainda pensa no que dizer.
    act(() => ReconhecimentoFalso.ultimo!.encerrouSozinho());
    avancar(600);

    expect(ditado.ouvindo).toBe(true);
    expect(ReconhecimentoFalso.instancias).toHaveLength(2);

    // E o que for dito depois do recomeço continua sendo aproveitado.
    act(() => ReconhecimentoFalso.ultimo!.ouviu("Trabalho com atendimento ao público"));
    expect(ditado.final).toContain("Trabalho com atendimento ao público");
  });

  it("não recomeça para sempre: depois de várias voltas sem ouvir nada, para e explica", () => {
    montar();
    act(() => ditado.iniciar());

    for (let i = 0; i < 6; i += 1) {
      act(() => ReconhecimentoFalso.ultimo!.falhou("no-speech"));
      avancar(600);
    }

    expect(ditado.ouvindo).toBe(false);
    expect(ditado.erro).toMatch(/ouvimos/i);
  });

  it("o contador de silêncio zera quando a pessoa fala", () => {
    montar();
    act(() => ditado.iniciar());

    for (let i = 0; i < 3; i += 1) {
      act(() => ReconhecimentoFalso.ultimo!.falhou("no-speech"));
      avancar(600);
    }

    act(() => ReconhecimentoFalso.ultimo!.ouviu("uma frase"));

    for (let i = 0; i < 3; i += 1) {
      act(() => ReconhecimentoFalso.ultimo!.falhou("no-speech"));
      avancar(600);
    }

    expect(ditado.ouvindo).toBe(true);
  });

  it("parar encerra de vez: não recomeça depois", () => {
    montar();
    act(() => ditado.iniciar());
    act(() => ditado.parar());
    act(() => ReconhecimentoFalso.ultimo!.encerrouSozinho());
    avancar(1000);

    expect(ditado.ouvindo).toBe(false);
    expect(ReconhecimentoFalso.instancias).toHaveLength(1);
  });
});

describe("falhas que hoje passam em silêncio", () => {
  it("terminou sem nada e sem erro: a pessoa precisa saber o que aconteceu", () => {
    montar();
    act(() => ditado.iniciar());
    act(() => ditado.parar());
    act(() => ReconhecimentoFalso.ultimo!.encerrouSozinho());
    avancar(600);

    expect(ditado.ouvindo).toBe(false);
    expect(ditado.erro).toBeTruthy();
  });

  it("erro sem `onend` (acontece em alguns navegadores) não deixa o ditado travado para sempre", () => {
    montar();
    act(() => ditado.iniciar());

    // Falha sem o evento de fim: o estado não pode ficar preso em "ouvindo".
    act(() => ReconhecimentoFalso.ultimo!.falhou("audio-capture", false));
    avancar(600);

    expect(ditado.ouvindo).toBe(false);

    // E tentar de novo precisa funcionar, não ser ignorado em silêncio.
    act(() => ditado.iniciar());
    expect(ditado.ouvindo).toBe(true);
    expect(ReconhecimentoFalso.instancias).toHaveLength(2);
  });

  it("parar não vira mensagem de erro assustadora (`aborted` é o fim normal)", () => {
    montar();
    act(() => ditado.iniciar());
    act(() => ReconhecimentoFalso.ultimo!.ouviu("alguma coisa"));
    act(() => ditado.parar());
    act(() => ReconhecimentoFalso.ultimo!.falhou("aborted"));
    avancar(600);

    expect(ditado.erro).toBeNull();
    expect(ditado.final).toContain("alguma coisa");
  });

  it("microfone negado para a escuta e não tenta de novo sozinho", () => {
    montar();
    act(() => ditado.iniciar());
    act(() => ReconhecimentoFalso.ultimo!.falhou("not-allowed"));
    avancar(1000);

    expect(ditado.ouvindo).toBe(false);
    expect(ditado.erro).toMatch(/microfone/i);
    expect(ReconhecimentoFalso.instancias).toHaveLength(1);
  });

  it("`start()` que estoura (sessão anterior ainda viva) avisa em vez de não fazer nada", () => {
    montar();
    ReconhecimentoFalso.falhaAoIniciar = true;

    act(() => ditado.iniciar());

    expect(ditado.ouvindo).toBe(false);
    expect(ditado.erro).toBeTruthy();
  });
});

describe("a voz do próprio site não atrapalha o microfone", () => {
  it("ao ligar o ditado, o ACESSO para de falar (senão o microfone ouve a própria leitura)", () => {
    montar();
    act(() => ditado.iniciar());

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
