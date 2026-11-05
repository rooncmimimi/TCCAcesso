import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  aplicarDestaque,
  criarRange,
  dividirEmFrases,
  intervaloDaPalavra,
  limparDestaques,
  montarMapa,
  suporteDestaque,
} from "./leituraDestacada";

function montar(html: string): HTMLElement {
  document.body.innerHTML = `<div id="raiz">${html}</div>`;
  return document.getElementById("raiz")!;
}

describe("montarMapa", () => {
  it("junta o texto visível e reduz espaços repetidos a um", () => {
    const raiz = montar(`<p>  Olá,   mundo\n  novo  </p>`);

    expect(montarMapa(raiz).texto).toBe("Olá, mundo novo");
  });

  it("devolve o texto já aparado, porque a fala também é aparada", () => {
    const { texto } = montarMapa(montar(`   <p> Oi </p>   `));

    expect(texto).toBe(texto.trim());
    expect(texto).toBe("Oi");
  });

  it("separa blocos diferentes com espaço, mas não parte uma palavra com formatação no meio", () => {
    expect(montarMapa(montar(`<p>Primeiro</p><p>Segundo</p>`)).texto).toBe("Primeiro Segundo");
    expect(montarMapa(montar(`<p>Vaga <strong>inclusiva</strong>, agora</p>`)).texto).toBe("Vaga inclusiva, agora");
    expect(montarMapa(montar(`<p><b>Pa</b>lavra</p>`)).texto).toBe("Palavra");
  });

  it("ignora o que está oculto, aria-hidden e texto só para leitor de tela", () => {
    const raiz = montar(`
      <p>Visível</p>
      <p hidden>Oculto</p>
      <p aria-hidden="true">Escondido</p>
      <span class="sr-only">Só leitor de tela</span>
      <script>var x = 1;</script>
    `);

    expect(montarMapa(raiz).texto).toBe("Visível");
  });

  it("sem texto, devolve mapa vazio", () => {
    expect(montarMapa(montar(`<div><img alt="x" /></div>`)).texto).toBe("");
  });
});

describe("criarRange", () => {
  it("cobre exatamente o trecho pedido, mesmo atravessando elementos e espaços reduzidos", () => {
    const raiz = montar(`<p>Vaga   <strong>inclusiva</strong>\n para você</p>`);
    const mapa = montarMapa(raiz);
    expect(mapa.texto).toBe("Vaga inclusiva para você");

    const inicio = mapa.texto.indexOf("inclusiva");
    expect(criarRange(mapa, inicio, inicio + "inclusiva".length)?.toString()).toBe("inclusiva");

    const antes = mapa.texto.indexOf("para");
    expect(criarRange(mapa, antes, mapa.texto.length)?.toString()).toBe("para você");
  });

  it("recusa trecho fora do texto ou vazio", () => {
    const mapa = montarMapa(montar(`<p>Oi</p>`));

    expect(criarRange(mapa, 0, 99)).toBeNull();
    expect(criarRange(mapa, -1, 1)).toBeNull();
    expect(criarRange(mapa, 1, 1)).toBeNull();
  });
});

describe("intervaloDaPalavra", () => {
  const texto = "Você vai cuidar, com calma, da agenda.";

  it("devolve a palavra que começa no índice", () => {
    const [i, f] = intervaloDaPalavra(texto, 5)!;
    expect(texto.slice(i, f)).toBe("vai");
  });

  it("deixa a pontuação colada de fora do destaque", () => {
    const [i, f] = intervaloDaPalavra(texto, texto.indexOf("cuidar"))!;
    expect(texto.slice(i, f)).toBe("cuidar");

    const [a, b] = intervaloDaPalavra(texto, texto.indexOf("agenda"))!;
    expect(texto.slice(a, b)).toBe("agenda");
  });

  it("num espaço, vale a palavra seguinte", () => {
    const [i, f] = intervaloDaPalavra("um dois", 3)!;
    expect("um dois".slice(i, f)).toBe("dois");
  });

  it("devolve null para índice inválido", () => {
    expect(intervaloDaPalavra("oi", -1)).toBeNull();
    expect(intervaloDaPalavra("oi", 2)).toBeNull();
    expect(intervaloDaPalavra("oi", 1.5)).toBeNull();
    expect(intervaloDaPalavra("oi", Number.NaN)).toBeNull();
  });

  it("não perde uma palavra feita só de pontuação", () => {
    const [i, f] = intervaloDaPalavra("a ... b", 2)!;
    expect("a ... b".slice(i, f)).toBe("...");
  });
});

describe("dividirEmFrases", () => {
  const frases = (t: string) => dividirEmFrases(t).map(([i, f]) => t.slice(i, f));

  it("quebra depois de ponto final, exclamação e interrogação", () => {
    expect(frases("Olá. Tudo bem? Sim! Até logo.")).toEqual(["Olá.", "Tudo bem?", "Sim!", "Até logo."]);
  });

  it("não corta valores, domínios nem abreviações coladas", () => {
    expect(frases("Salário de R$ 1.500,00 por mês. Veja www.exemplo.com.br hoje.")).toEqual([
      "Salário de R$ 1.500,00 por mês.",
      "Veja www.exemplo.com.br hoje.",
    ]);
  });

  it("mantém o resto sem pontuação final como última frase", () => {
    expect(frases("Primeira frase. Segunda sem ponto")).toEqual(["Primeira frase.", "Segunda sem ponto"]);
  });

  it("texto sem pontuação é uma frase só, e texto vazio não tem nenhuma", () => {
    expect(frases("só um trecho")).toEqual(["só um trecho"]);
    expect(frases("")).toEqual([]);
  });
});

describe("destaque (CSS Custom Highlight API)", () => {
  type Registro = Map<string, unknown>;
  const global = globalThis as unknown as { CSS?: { highlights?: Registro }; Highlight?: unknown };
  let cssOriginal: unknown;
  let highlightOriginal: unknown;

  beforeEach(() => {
    cssOriginal = global.CSS;
    highlightOriginal = global.Highlight;
  });

  afterEach(() => {
    global.CSS = cssOriginal as typeof global.CSS;
    global.Highlight = highlightOriginal;
  });

  it("sem a API, diz que não há suporte e não quebra", () => {
    global.CSS = {};
    global.Highlight = undefined;

    expect(suporteDestaque()).toBe(false);
    expect(() => aplicarDestaque("x", document.createRange())).not.toThrow();
    expect(() => limparDestaques()).not.toThrow();
  });

  it("com a API, aplica, troca e apaga o destaque pelo nome", () => {
    const registro: Registro = new Map();
    global.CSS = { highlights: registro };
    global.Highlight = class {
      ranges: Range[];
      constructor(...ranges: Range[]) {
        this.ranges = ranges;
      }
    };

    expect(suporteDestaque()).toBe(true);

    const range = document.createRange();
    aplicarDestaque("acesso-palavra", range);
    expect(registro.has("acesso-palavra")).toBe(true);

    aplicarDestaque("acesso-palavra", null);
    expect(registro.has("acesso-palavra")).toBe(false);

    aplicarDestaque("acesso-palavra", range);
    aplicarDestaque("acesso-frase", range);
    limparDestaques();
    expect(registro.size).toBe(0);
  });
});
