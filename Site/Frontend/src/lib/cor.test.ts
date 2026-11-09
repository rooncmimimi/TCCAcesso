import { describe, it, expect } from "vitest";

import {
  TEXTO_CLARO,
  TEXTO_ESCURO,
  ajustar,
  garantirContraste,
  hexParaOklch,
  melhorTexto,
  misturar,
  oklchParaHex,
  parLegivel,
} from "./cor";
import { ehCorHex, razaoDeContraste } from "./contraste";

/**
 * A conta de cor dos ajustes. O que importa aqui não é o número exato de cada canal, e sim as
 * promessas: ida e volta não estraga a cor, cada ajuste mexe no que diz que mexe, e o texto nunca
 * fica ilegível — por mais que a pessoa puxe os controles.
 */

const CORES = ["#16772f", "#0072b2", "#c14300", "#f0e442", "#334155", "#ffffff", "#000000"];

describe("hex ↔ oklch", () => {
  it.each(CORES)("ida e volta devolve a mesma cor: %s", (hex) => {
    expect(oklchParaHex(hexParaOklch(hex))).toBe(hex);
  });

  it("o branco é claridade 1 sem cor nenhuma", () => {
    const branco = hexParaOklch("#ffffff");

    expect(branco.l).toBeCloseTo(1, 2);
    expect(branco.c).toBeCloseTo(0, 3);
  });

  it("o preto é claridade 0", () => {
    expect(hexParaOklch("#000000").l).toBeCloseTo(0, 3);
  });

  it("o verde da marca fica na faixa de matiz do verde", () => {
    const verde = hexParaOklch("#16772f");

    expect(verde.h).toBeGreaterThan(120);
    expect(verde.h).toBeLessThan(160);
  });
});

describe("ajustar", () => {
  it("sem ajuste, a cor não muda", () => {
    expect(ajustar("#0072b2", {})).toBe("#0072b2");
  });

  it("menos saturação aproxima do cinza, mantendo a claridade", () => {
    const original = hexParaOklch("#0072b2");
    const lavada = hexParaOklch(ajustar("#0072b2", { saturacao: 0.3 }));

    expect(lavada.c).toBeLessThan(original.c);
    expect(lavada.l).toBeCloseTo(original.l, 1);
  });

  it("mais brilho clareia sem tirar a cor", () => {
    const original = hexParaOklch("#16772f");
    const clara = hexParaOklch(ajustar("#16772f", { brilho: 1.3 }));

    expect(clara.l).toBeGreaterThan(original.l);
    expect(clara.c).toBeGreaterThan(0.02);
  });

  it("brilho exagerado não deixa a cor virar branco puro", () => {
    expect(hexParaOklch(ajustar("#f0e442", { brilho: 5 })).l).toBeLessThanOrEqual(0.97);
  });

  it("devolve sempre #rrggbb", () => {
    for (const cor of CORES) {
      expect(ehCorHex(ajustar(cor, { saturacao: 2, brilho: 1.4 }))).toBe(true);
    }
  });
});

describe("misturar", () => {
  it("0 devolve a primeira, 1 devolve a segunda", () => {
    expect(misturar("#16772f", "#0072b2", 0)).toBe("#16772f");
    expect(misturar("#16772f", "#0072b2", 1)).toBe("#0072b2");
  });

  it("no meio do caminho, o matiz fica entre os dois", () => {
    const verde = hexParaOklch("#16772f").h;
    const azul = hexParaOklch("#0072b2").h;
    const meio = hexParaOklch(misturar("#16772f", "#0072b2", 0.5)).h;

    expect(meio).toBeGreaterThan(Math.min(verde, azul));
    expect(meio).toBeLessThan(Math.max(verde, azul));
  });

  it("pega o caminho curto do matiz: de vermelho a magenta não passa pelo verde", () => {
    // #d5131c fica perto de 29°, #a4036f perto de 357°. O caminho curto passa pelo zero.
    const meio = hexParaOklch(misturar("#d5131c", "#a4036f", 0.5)).h;

    expect(meio > 330 || meio < 30).toBe(true);
  });

  it("valores fora da faixa são presos entre 0 e 1", () => {
    expect(misturar("#16772f", "#0072b2", -3)).toBe("#16772f");
    expect(misturar("#16772f", "#0072b2", 9)).toBe("#0072b2");
  });
});

describe("melhorTexto", () => {
  it("preenchimento escuro pede texto claro", () => {
    expect(melhorTexto("#16772f")).toBe(TEXTO_CLARO);
  });

  it("preenchimento claro pede texto escuro", () => {
    expect(melhorTexto("#f0e442")).toBe(TEXTO_ESCURO);
  });
});

describe("garantirContraste", () => {
  it("cor que já passa não é tocada", () => {
    expect(garantirContraste("#0072b2", TEXTO_CLARO, 4.5)).toBe("#0072b2");
  });

  it("escurece até alcançar o mínimo com texto branco", () => {
    const corrigida = garantirContraste("#56b4e9", TEXTO_CLARO, 4.5);

    expect(razaoDeContraste(corrigida, TEXTO_CLARO)).toBeGreaterThanOrEqual(4.5);
    expect(hexParaOklch(corrigida).l).toBeLessThan(hexParaOklch("#56b4e9").l);
  });

  it("clareia até alcançar o mínimo com texto escuro", () => {
    const corrigida = garantirContraste("#334155", TEXTO_ESCURO, 4.5);

    expect(razaoDeContraste(corrigida, TEXTO_ESCURO)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("parLegivel: a promessa que sustenta os controles", () => {
  const ajustesExtremos = [
    { saturacao: 0, brilho: 1 },
    { saturacao: 2, brilho: 1 },
    { saturacao: 1, brilho: 0.5 },
    { saturacao: 1, brilho: 1.6 },
    { saturacao: 0, brilho: 1.6 },
    { saturacao: 2, brilho: 0.5 },
  ];

  it.each(CORES)("%s continua legível em qualquer combinação de ajuste", (cor) => {
    for (const ajustes of ajustesExtremos) {
      const { fundo, texto } = parLegivel(cor, ajustes);

      expect(ehCorHex(fundo)).toBe(true);
      expect(razaoDeContraste(fundo, texto), `${cor} com ${JSON.stringify(ajustes)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("um contraste mínimo maior é respeitado", () => {
    const { fundo, texto } = parLegivel("#0072b2", { contrasteMinimo: 7 });

    expect(razaoDeContraste(fundo, texto)).toBeGreaterThanOrEqual(7);
  });

  it("cor inválida não vira CSS esquisito: devolve o que veio", () => {
    expect(parLegivel("rgb(1,2,3)").fundo).toBe("rgb(1,2,3)");
  });
});
