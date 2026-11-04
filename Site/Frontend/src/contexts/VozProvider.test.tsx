import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VozContextValue } from "@/contexts/VozContext";

const { preferencias, salvar } = vi.hoisted(() => ({
  preferencias: { speechRate: 1.4, screenReader: true, voiceConsent: true },
  salvar: vi.fn(),
}));

vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias, salvar }) }));

const { VozProvider } = await import("./VozProvider");
const { useVoz } = await import("@/hooks/useVoz");

/** Fala simulada: guarda os manipuladores que o provider liga, e o teste os dispara. */
class FalaFalsa {
  lang = "";
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onboundary: ((e: { charIndex: number; charLength?: number; name: string }) => void) | null = null;
  constructor(public text: string) {}
}

let falas: FalaFalsa[];
let sintese: {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  speaking: boolean;
};
let voz: VozContextValue;

function Capturar() {
  voz = useVoz();
  return null;
}

beforeEach(() => {
  falas = [];
  sintese = {
    speak: vi.fn((f: FalaFalsa) => falas.push(f)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    speaking: true,
  };
  vi.stubGlobal("SpeechSynthesisUtterance", FalaFalsa);
  Object.defineProperty(window, "speechSynthesis", { value: sintese, configurable: true });
  render(
    <VozProvider>
      <Capturar />
    </VozProvider>,
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "speechSynthesis");
});

describe("VozProvider: falar", () => {
  it("fala o texto aparado, em português e na velocidade das preferências", () => {
    act(() => voz.falar("  Olá, mundo  "));

    expect(falas[0].text).toBe("Olá, mundo");
    expect(falas[0].lang).toBe("pt-BR");
    expect(falas[0].rate).toBe(1.4);
  });

  it("não fala texto vazio", () => {
    act(() => voz.falar("   "));

    expect(sintese.speak).not.toHaveBeenCalled();
  });

  it("corta a fala anterior por padrão e não corta com interrupt: false", () => {
    act(() => voz.falar("primeira"));
    act(() => voz.falar("segunda"));
    expect(sintese.cancel).toHaveBeenCalledTimes(2);

    sintese.cancel.mockClear();
    act(() => voz.falar("terceira", { interrupt: false }));
    expect(sintese.cancel).not.toHaveBeenCalled();
  });

  it("repassa início, limites de palavra e fim", () => {
    const aoIniciar = vi.fn();
    const aoLimite = vi.fn();
    const aoTerminar = vi.fn();
    act(() => voz.falar("um dois", { aoIniciar, aoLimite, aoTerminar }));

    act(() => falas[0].onstart?.());
    expect(aoIniciar).toHaveBeenCalledTimes(1);
    expect(voz.falando).toBe(true);

    act(() => falas[0].onboundary?.({ charIndex: 3, charLength: 4, name: "word" }));
    expect(aoLimite).toHaveBeenCalledWith({ charIndex: 3, charLength: 4, name: "word" });

    act(() => falas[0].onend?.());
    expect(aoTerminar).toHaveBeenCalledWith("fim");
    expect(voz.falando).toBe(false);
  });

  it("distingue erro de cancelamento, e avisa uma vez só mesmo com end e error", () => {
    const aoTerminar = vi.fn();
    act(() => voz.falar("a", { aoTerminar }));
    act(() => falas[0].onerror?.({ error: "interrupted" }));
    act(() => falas[0].onend?.());
    expect(aoTerminar).toHaveBeenCalledTimes(1);
    expect(aoTerminar).toHaveBeenCalledWith("cancelada");

    const aoTerminarErro = vi.fn();
    act(() => voz.falar("b", { aoTerminar: aoTerminarErro }));
    act(() => falas[1].onerror?.({ error: "synthesis-failed" }));
    expect(aoTerminarErro).toHaveBeenCalledWith("erro");
  });

  it("o aviso tardio de uma fala cancelada não derruba o estado da fala nova", () => {
    act(() => voz.falar("antiga"));
    act(() => falas[0].onstart?.());
    act(() => voz.falar("nova")); // cancela a antiga e entra na fila
    act(() => falas[1].onstart?.());
    expect(voz.falando).toBe(true);

    act(() => falas[0].onerror?.({ error: "interrupted" })); // chega depois

    expect(voz.falando).toBe(true);
  });

  it("com várias falas na fila, só deixa de falar quando a última termina", () => {
    act(() => voz.falar("um", { interrupt: false }));
    act(() => voz.falar("dois", { interrupt: false }));
    act(() => falas[0].onstart?.());

    act(() => falas[0].onend?.());
    expect(voz.falando).toBe(true);

    act(() => falas[1].onend?.());
    expect(voz.falando).toBe(false);
  });
});

describe("VozProvider: pausar, retomar e parar", () => {
  it("pausa e retoma a fala em andamento", () => {
    act(() => voz.falar("texto"));

    act(() => voz.pausar());
    expect(sintese.pause).toHaveBeenCalledTimes(1);
    expect(voz.pausado).toBe(true);

    act(() => voz.retomar());
    expect(sintese.resume).toHaveBeenCalledTimes(1);
    expect(voz.pausado).toBe(false);
  });

  it("não pausa quando não há nada sendo falado", () => {
    sintese.speaking = false;

    act(() => voz.pausar());

    expect(sintese.pause).not.toHaveBeenCalled();
    expect(voz.pausado).toBe(false);
  });

  it("parar cancela, zera pausa e falando", () => {
    act(() => voz.falar("texto"));
    act(() => falas[0].onstart?.());
    act(() => voz.pausar());

    act(() => voz.parar());

    expect(sintese.cancel).toHaveBeenCalled();
    expect(voz.falando).toBe(false);
    expect(voz.pausado).toBe(false);
  });
});
