import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OpcoesFala } from "@/contexts/VozContext";
import type { LeituraDestacadaContextValue } from "@/contexts/LeituraDestacadaContext";

/**
 * A voz é simulada: `falar` guarda as opções de cada fala, e o teste dispara `aoIniciar`,
 * `aoLimite` e `aoTerminar` como o navegador faria. A CSS Custom Highlight API também é simulada
 * (o jsdom não a tem), com um registro que o teste lê.
 */
const { falar, pararVoz, pausar, retomar, preferencias, estadoVoz } = vi.hoisted(() => ({
  falar: vi.fn(),
  pararVoz: vi.fn(),
  pausar: vi.fn(),
  retomar: vi.fn(),
  preferencias: { wordHighlight: true, estimatedHighlight: false, speechRate: 1 },
  estadoVoz: { pausado: false },
}));

vi.mock("@/hooks/useVoz", () => ({ useVoz: () => ({ falar, parar: pararVoz, pausar, retomar, pausado: estadoVoz.pausado }) }));
vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias }) }));

const { LeituraDestacadaProvider, ESPERA_DO_PRIMEIRO_LIMITE_MS } = await import("./LeituraDestacadaProvider");
const { criarCronograma, lerRitmo, PESO_POR_SEGUNDO_PADRAO } = await import("@/lib/leituraEstimada");
const { useLeituraDestacada } = await import("@/hooks/useLeituraDestacada");

type Registro = Map<string, { ranges: Range[] }>;
const global = globalThis as unknown as { CSS?: { highlights?: Registro }; Highlight?: unknown };
let registro: Registro;
let cssOriginal: unknown;
let highlightOriginal: unknown;

let leitura: LeituraDestacadaContextValue;

function Capturar() {
  leitura = useLeituraDestacada();
  return null;
}

function montar(html: string) {
  render(
    <LeituraDestacadaProvider>
      <Capturar />
      <div id="alvo" dangerouslySetInnerHTML={{ __html: html }} />
    </LeituraDestacadaProvider>,
  );
  return document.getElementById("alvo") as HTMLElement;
}

/** As opções da n-ésima chamada de `falar`, e o texto falado. */
const fala = (n = 0) => ({ texto: falar.mock.calls[n][0] as string, opcoes: (falar.mock.calls[n][1] ?? {}) as OpcoesFala });

const palavra = () => registro.get("acesso-palavra")?.ranges[0]?.toString();
const frase = () => registro.get("acesso-frase")?.ranges[0]?.toString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  window.sessionStorage.clear();
  preferencias.wordHighlight = true;
  preferencias.estimatedHighlight = false;
  preferencias.speechRate = 1;
  estadoVoz.pausado = false;

  cssOriginal = global.CSS;
  highlightOriginal = global.Highlight;
  registro = new Map();
  global.CSS = { highlights: registro };
  global.Highlight = class {
    ranges: Range[];
    constructor(...ranges: Range[]) {
      this.ranges = ranges;
    }
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  global.CSS = cssOriginal as typeof global.CSS;
  global.Highlight = highlightOriginal;
});

describe("destaque palavra por palavra", () => {
  it("fala o texto do bloco e destaca a palavra que a voz alcança", () => {
    const alvo = montar("<p>Você vai organizar a agenda.</p>");

    act(() => leitura.ler(alvo));
    expect(fala().texto).toBe("Você vai organizar a agenda.");
    expect(leitura.lendo).toBe(true);
    expect(leitura.modo).toBe("palavra");

    act(() => fala().opcoes.aoIniciar?.());
    act(() => fala().opcoes.aoLimite?.({ charIndex: 0, name: "word" }));
    expect(palavra()).toBe("Você");

    act(() => fala().opcoes.aoLimite?.({ charIndex: 5, name: "word" }));
    expect(palavra()).toBe("vai");

    act(() => fala().opcoes.aoLimite?.({ charIndex: "Você vai organizar a ".length, name: "word" }));
    expect(palavra()).toBe("agenda");
  });

  it("descarta evento fora de ordem, repetido ou de frase, sem destacar palavra errada", () => {
    const alvo = montar("<p>Um dois três quatro.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala().opcoes.aoIniciar?.());

    act(() => fala().opcoes.aoLimite?.({ charIndex: 4, name: "word" }));
    expect(palavra()).toBe("dois");

    act(() => fala().opcoes.aoLimite?.({ charIndex: 0, name: "word" })); // voltou: ignora
    act(() => fala().opcoes.aoLimite?.({ charIndex: 4, name: "word" })); // repetido: ignora
    act(() => fala().opcoes.aoLimite?.({ charIndex: 9, name: "sentence" })); // frase: ignora
    act(() => fala().opcoes.aoLimite?.({ charIndex: 999, name: "word" })); // fora do texto: apaga
    expect(palavra()).toBeUndefined();
  });

  it("o prefixo é falado mas não é destacado, e o destaque não se desloca por causa dele", () => {
    const alvo = montar("<h2>Requisitos</h2>");

    act(() => leitura.ler(alvo, { prefixo: "Título de nível 2: " }));
    expect(fala().texto).toBe("Título de nível 2: Requisitos");

    act(() => fala().opcoes.aoIniciar?.());
    act(() => fala().opcoes.aoLimite?.({ charIndex: 0, name: "word" })); // "Título": só prova que há eventos
    expect(palavra()).toBeUndefined();

    act(() => fala().opcoes.aoLimite?.({ charIndex: "Título de nível 2: ".length, name: "word" }));
    expect(palavra()).toBe("Requisitos");
  });

  it("ao terminar, apaga o destaque e encerra a leitura", () => {
    const alvo = montar("<p>Fim de linha.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala().opcoes.aoIniciar?.());
    act(() => fala().opcoes.aoLimite?.({ charIndex: 0, name: "word" }));
    expect(palavra()).toBe("Fim");

    act(() => fala().opcoes.aoTerminar?.("fim"));

    expect(palavra()).toBeUndefined();
    expect(leitura.lendo).toBe(false);
    expect(leitura.modo).toBeNull();
  });

  it("parar apaga o destaque, para a voz e ignora o que a fala antiga ainda avisar", () => {
    const alvo = montar("<p>Interrompida.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala().opcoes.aoIniciar?.());
    act(() => fala().opcoes.aoLimite?.({ charIndex: 0, name: "word" }));

    act(() => leitura.parar());

    expect(pararVoz).toHaveBeenCalled();
    expect(palavra()).toBeUndefined();
    expect(leitura.lendo).toBe(false);

    act(() => fala().opcoes.aoLimite?.({ charIndex: 0, name: "word" }));
    expect(palavra()).toBeUndefined();
  });

  it("uma leitura nova substitui a anterior, e os avisos da antiga não mexem na nova", () => {
    const alvo = montar("<p>Primeira.</p><p id='b'>Segunda leitura.</p>");
    act(() => leitura.ler(alvo.querySelector("p")!));
    const antiga = fala(0).opcoes;

    act(() => leitura.ler(document.getElementById("b")!));
    act(() => fala(1).opcoes.aoIniciar?.());
    act(() => fala(1).opcoes.aoLimite?.({ charIndex: 0, name: "word" }));
    expect(palavra()).toBe("Segunda");

    act(() => antiga.aoLimite?.({ charIndex: 0, name: "word" }));
    act(() => antiga.aoTerminar?.("cancelada"));
    expect(palavra()).toBe("Segunda");
    expect(leitura.lendo).toBe(true);
  });

  it("expõe pausar e retomar da voz", () => {
    montar("<p>Texto.</p>");

    act(() => leitura.pausar());
    act(() => leitura.retomar());

    expect(pausar).toHaveBeenCalledTimes(1);
    expect(retomar).toHaveBeenCalledTimes(1);
  });
});

describe("plano B por frase (voz sem evento de palavra)", () => {
  it("sem nenhum evento de palavra, recomeça por frases e destaca a frase de cada fala", () => {
    const alvo = montar("<p>Primeira frase. Segunda frase aqui.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala(0).opcoes.aoIniciar?.());

    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_PRIMEIRO_LIMITE_MS + 10);
    });

    // A fala inteira foi substituída por uma fala por frase.
    expect(falar).toHaveBeenCalledTimes(3);
    expect(fala(1).texto).toBe("Primeira frase.");
    expect(fala(1).opcoes.interrupt).toBe(true);
    expect(fala(2).texto).toBe("Segunda frase aqui.");
    expect(fala(2).opcoes.interrupt).toBe(false);
    expect(leitura.modo).toBe("frase");

    // O cancelamento da fala antiga não encerra a leitura nova.
    act(() => fala(0).opcoes.aoTerminar?.("cancelada"));
    expect(leitura.lendo).toBe(true);

    act(() => fala(1).opcoes.aoIniciar?.());
    expect(frase()).toBe("Primeira frase.");
    act(() => fala(1).opcoes.aoTerminar?.("fim"));
    act(() => fala(2).opcoes.aoIniciar?.());
    expect(frase()).toBe("Segunda frase aqui.");

    act(() => fala(2).opcoes.aoTerminar?.("fim"));
    expect(frase()).toBeUndefined();
    expect(leitura.lendo).toBe(false);
  });

  it("lembra que a voz não emite palavra e já começa por frase na leitura seguinte", () => {
    const alvo = montar("<p>Uma. Duas.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_PRIMEIRO_LIMITE_MS + 10);
    });
    falar.mockClear();

    act(() => leitura.ler(alvo));

    expect(fala(0).texto).toBe("Uma.");
    expect(leitura.modo).toBe("frase");
  });

  it("se a voz emite palavra a tempo, não cai para frase", () => {
    const alvo = montar("<p>Uma. Duas.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => fala(0).opcoes.aoLimite?.({ charIndex: 0, name: "word" }));

    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_PRIMEIRO_LIMITE_MS + 10);
    });

    expect(falar).toHaveBeenCalledTimes(1);
    expect(leitura.modo).toBe("palavra");
  });

  it("eventos só de frase não bastam: a voz continua tratada como sem palavra", () => {
    const alvo = montar("<p>Uma. Duas.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => fala(0).opcoes.aoLimite?.({ charIndex: 0, name: "sentence" }));

    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_PRIMEIRO_LIMITE_MS + 10);
    });

    expect(leitura.modo).toBe("frase");
  });

  it("não recomeça se a leitura já terminou antes do prazo", () => {
    const alvo = montar("<p>Curta.</p>");
    act(() => leitura.ler(alvo));
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => fala(0).opcoes.aoTerminar?.("fim"));

    act(() => {
      vi.advanceTimersByTime(ESPERA_DO_PRIMEIRO_LIMITE_MS + 10);
    });

    expect(falar).toHaveBeenCalledTimes(1);
  });
});

describe("destaque aproximado (voz sem evento de palavra, com a estimativa ligada)", () => {
  /** Faz a voz "não emitir palavra": passa a espera e cai para frases. */
  function cairParaFrases(html: string) {
    preferencias.estimatedHighlight = true;
    window.sessionStorage.setItem("acesso:voz:so-frases", "1");

    const alvo = montar(html);

    act(() => leitura.ler(alvo));

    return alvo;
  }

  it("o modo diz que é aproximado, e a frase e a palavra são destacadas ao mesmo tempo", () => {
    cairParaFrases("<p>Você vai organizar a agenda.</p>");

    expect(leitura.modo).toBe("estimado");

    act(() => fala(0).opcoes.aoIniciar?.());

    expect(frase()).toBe("Você vai organizar a agenda.");
    expect(palavra()).toBe("Você");
  });

  it("a palavra avança com o tempo, na ordem, e fica na última até a fala acabar", () => {
    cairParaFrases("<p>Um dois três quatro cinco seis sete oito nove dez.</p>");
    act(() => fala(0).opcoes.aoIniciar?.());

    const vistas: string[] = [];
    const texto = "Um dois três quatro cinco seis sete oito nove dez.";
    const cronograma = criarCronograma(texto, PESO_POR_SEGUNDO_PADRAO, 1);

    for (let t = 0; t <= cronograma.duracaoMs + 600; t += 100) {
      act(() => void vi.advanceTimersByTime(100));
      const p = palavra();

      if (p && vistas[vistas.length - 1] !== p) vistas.push(p);
    }

    expect(vistas).toEqual(["Um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez"]);
    expect(palavra()).toBe("dez"); // passou do tempo estimado: não some nem passa do fim
    expect(frase()).toBe(texto);
  });

  it("a pausa congela a palavra, e continuar a solta de onde parou", () => {
    preferencias.estimatedHighlight = true;
    window.sessionStorage.setItem("acesso:voz:so-frases", "1");

    // Função: um elemento novo a cada chamada, senão o React nem refaz o render no `rerender`.
    // O mesmo objeto de HTML nas duas renderizações: um objeto novo faria o React reescrever o DOM e soltar os nós do destaque.
    const html = { __html: "<p>Um dois três quatro cinco seis sete oito nove dez.</p>" };
    const arvore = () => (
      <LeituraDestacadaProvider>
        <Capturar />
        <div id="alvo" dangerouslySetInnerHTML={html} />
      </LeituraDestacadaProvider>
    );
    const { rerender } = render(arvore());

    act(() => leitura.ler(document.getElementById("alvo") as HTMLElement));
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => void vi.advanceTimersByTime(900));

    const antes = palavra();

    expect(antes).toBeTruthy();

    // A voz diz que está pausada: o provider relê o estado no render seguinte.
    estadoVoz.pausado = true;
    rerender(arvore());
    act(() => void vi.advanceTimersByTime(10_000));
    expect(palavra()).toBe(antes); // congelada, mesmo com 10 s de relógio

    estadoVoz.pausado = false;
    rerender(arvore());
    act(() => void vi.advanceTimersByTime(900));
    expect(palavra()).not.toBe(antes); // continuou de onde parou
  });

  it("ao terminar a frase, apaga a palavra e aprende o ritmo da voz", () => {
    cairParaFrases("<p>Esta é uma frase de teste com bastante palavras para medir o ritmo.</p>");
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => void vi.advanceTimersByTime(3000));

    const antes = lerRitmo();

    act(() => fala(0).opcoes.aoTerminar?.("fim"));

    expect(palavra()).toBeUndefined();
    expect(lerRitmo()).not.toBe(antes);
  });

  it("cancelar a fala não ensina nada e não deixa palavra para trás", () => {
    cairParaFrases("<p>Esta é uma frase de teste com bastante palavras para medir o ritmo.</p>");
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => void vi.advanceTimersByTime(3000));

    const antes = lerRitmo();

    act(() => leitura.parar());

    expect(palavra()).toBeUndefined();
    expect(lerRitmo()).toBe(antes);
  });

  it("com a estimativa desligada, só a frase é destacada", () => {
    preferencias.estimatedHighlight = false;
    window.sessionStorage.setItem("acesso:voz:so-frases", "1");

    const alvo = montar("<p>Você vai organizar a agenda.</p>");

    act(() => leitura.ler(alvo));
    act(() => fala(0).opcoes.aoIniciar?.());
    act(() => void vi.advanceTimersByTime(2000));

    expect(leitura.modo).toBe("frase");
    expect(frase()).toBe("Você vai organizar a agenda.");
    expect(palavra()).toBeUndefined();
  });

  it("o prefixo falado antes do texto não é destacado, e a palavra certa vem depois dele", () => {
    preferencias.estimatedHighlight = true;
    window.sessionStorage.setItem("acesso:voz:so-frases", "1");

    const alvo = montar("<h2>Requisitos obrigatórios da vaga</h2>");

    act(() => leitura.ler(alvo, { prefixo: "Título de nível 2: " }));
    act(() => fala(0).opcoes.aoIniciar?.());

    // No começo a voz ainda diz o prefixo: nada a destacar.
    expect(palavra()).toBeUndefined();

    const completo = "Título de nível 2: Requisitos obrigatórios da vaga";
    const cronograma = criarCronograma(completo, PESO_POR_SEGUNDO_PADRAO, 1);

    act(() => void vi.advanceTimersByTime(cronograma.duracaoMs - 50));
    expect(palavra()).toBe("vaga");
  });

  it("a velocidade escolhida acelera a estimativa", () => {
    preferencias.speechRate = 2;
    cairParaFrases("<p>Um dois três quatro cinco seis sete oito nove dez.</p>");
    act(() => fala(0).opcoes.aoIniciar?.());

    const lento = criarCronograma("Um dois três quatro cinco seis sete oito nove dez.", PESO_POR_SEGUNDO_PADRAO, 1).duracaoMs;

    act(() => void vi.advanceTimersByTime(lento / 2 + 50));
    expect(palavra()).toBe("dez");
  });
});

describe("plano C: sem destaque por palavra", () => {
  it("com a API ausente, marca o bloco inteiro e lê", () => {
    global.CSS = {};
    global.Highlight = undefined;
    const alvo = montar("<p>Sem API.</p>");
    const bloco = alvo.querySelector("p")!;

    act(() => leitura.ler(bloco));

    expect(leitura.modo).toBe("bloco");
    expect(bloco.getAttribute("data-speaking")).toBe("true");
    expect(fala().texto).toBe("Sem API.");

    act(() => fala().opcoes.aoTerminar?.("fim"));
    expect(bloco.hasAttribute("data-speaking")).toBe(false);
    expect(leitura.lendo).toBe(false);
  });

  it("com o destaque por palavra desligado nas preferências, só marca o bloco", () => {
    preferencias.wordHighlight = false;
    const alvo = montar("<p>Desligado.</p>");
    const bloco = alvo.querySelector("p")!;

    act(() => leitura.ler(bloco));

    expect(leitura.modo).toBe("bloco");
    expect(bloco.getAttribute("data-speaking")).toBe("true");
    expect(fala().opcoes.aoLimite).toBeUndefined();
  });

  it("elemento sem texto não fala nada", () => {
    const alvo = montar("<div></div>");

    act(() => leitura.ler(alvo));

    expect(falar).not.toHaveBeenCalled();
    expect(leitura.lendo).toBe(false);
  });
});
