import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LIMITE_DE_ESCUTA_MS, useComandoDeVoz } from "@/hooks/useComandoDeVoz";

/**
 * Os comandos de voz contra o que o navegador faz de verdade. Um comando é uma frase curta, então aqui
 * não há recomeço automático (ver `useDitado` para isso) — o que precisa funcionar é nunca ficar preso:
 * nem o estado em "ouvindo", nem a referência de uma escuta que o navegador não fechou.
 */

class ReconhecimentoFalso {
  static instancias: ReconhecimentoFalso[] = [];
  static falhaAoIniciar = false;
  static get ultimo() {
    return ReconhecimentoFalso.instancias[ReconhecimentoFalso.instancias.length - 1] ?? null;
  }
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn(() => {
    if (ReconhecimentoFalso.falhaAoIniciar) throw new Error("InvalidStateError");
  });
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    ReconhecimentoFalso.instancias.push(this);
  }
  ouviu(texto: string) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: texto } }] });
  }
  encerrouSozinho() {
    this.onend?.();
  }
  falhou(erro: string, comFim = true) {
    this.onerror?.({ error: erro });
    if (comFim) this.onend?.();
  }
}

type Voz = ReturnType<typeof useComandoDeVoz>;

let voz: Voz;
const ouvidos: string[] = [];

function Sonda() {
  voz = useComandoDeVoz((fala) => ouvidos.push(fala));

  return null;
}

const montar = () => render(<Sonda />);
const avancar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  ouvidos.length = 0;
  ReconhecimentoFalso.instancias = [];
  ReconhecimentoFalso.falhaAoIniciar = false;
  Object.defineProperty(window, "SpeechRecognition", { value: ReconhecimentoFalso, configurable: true });
  Object.defineProperty(window, "speechSynthesis", { value: { cancel: vi.fn() }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "speechSynthesis");
  document.documentElement.lang = "";
});

describe("o caminho que funciona", () => {
  it("ouve uma frase, entrega o texto e não reclama de nada", () => {
    montar();
    act(() => voz.iniciar());

    expect(voz.ouvindo).toBe(true);

    act(() => ReconhecimentoFalso.ultimo!.ouviu("ir para vagas"));
    act(() => ReconhecimentoFalso.ultimo!.encerrouSozinho());

    expect(ouvidos).toEqual(["ir para vagas"]);
    expect(voz.ouvindo).toBe(false);
    expect(voz.erro).toBeNull();
  });

  it("escuta no idioma do site, com região", () => {
    document.documentElement.lang = "es";
    montar();
    act(() => voz.iniciar());

    expect(ReconhecimentoFalso.ultimo!.lang).toBe("es-ES");
  });

  it("cala a leitura em voz do ACESSO: senão o microfone ouve o próprio site", () => {
    montar();
    act(() => voz.iniciar());

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

describe("o que travava o microfone", () => {
  it("uma escuta anterior que o navegador não fechou não impede a próxima", () => {
    montar();
    act(() => voz.iniciar());

    // Erro que não é dos definitivos e vem SEM o evento de fim: a referência ficava presa, e daí em
    // diante todo clique em "Falar um comando" não fazia nada, sem mensagem nenhuma.
    act(() => ReconhecimentoFalso.ultimo!.falhou("bad-grammar", false));

    expect(voz.ouvindo).toBe(false);

    act(() => voz.iniciar());

    expect(voz.ouvindo).toBe(true);
    expect(ReconhecimentoFalso.instancias).toHaveLength(2);
  });

  it("erro sem fim também não deixa o estado preso em ouvindo", () => {
    montar();
    act(() => voz.iniciar());
    act(() => ReconhecimentoFalso.ultimo!.falhou("audio-capture", false));

    expect(voz.ouvindo).toBe(false);
    expect(voz.erro).toMatch(/microfone/i);
  });

  it("`start()` que estoura avisa em vez de não fazer nada", () => {
    montar();
    ReconhecimentoFalso.falhaAoIniciar = true;
    act(() => voz.iniciar());

    expect(voz.ouvindo).toBe(false);
    expect(voz.erro).toBeTruthy();
  });
});

describe("silêncio e fim normal", () => {
  it("dez segundos sem nada: o microfone desliga e a pessoa fica sabendo por quê", () => {
    montar();
    act(() => voz.iniciar());
    avancar(LIMITE_DE_ESCUTA_MS);
    act(() => ReconhecimentoFalso.ultimo!.encerrouSozinho());

    expect(voz.ouvindo).toBe(false);
    expect(voz.erro).toMatch(/ouvimos/i);
  });

  it("parar não vira mensagem de erro assustadora (`aborted` é o fim normal)", () => {
    montar();
    act(() => voz.iniciar());
    act(() => ReconhecimentoFalso.ultimo!.ouviu("parar leitura"));
    act(() => voz.parar());
    act(() => ReconhecimentoFalso.ultimo!.falhou("aborted"));

    expect(voz.erro).toBeNull();
    expect(ouvidos).toEqual(["parar leitura"]);
  });

  it("microfone negado: a mensagem é a do cadeado, não a de silêncio", () => {
    montar();
    act(() => voz.iniciar());
    act(() => ReconhecimentoFalso.ultimo!.falhou("not-allowed"));

    expect(voz.ouvindo).toBe(false);
    expect(voz.erro).toMatch(/cadeado/i);
  });
});
