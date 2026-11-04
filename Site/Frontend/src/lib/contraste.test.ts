import { describe, expect, it } from "vitest";

import { avaliarContraste, ehCorHex, formatarRazao, luminancia, razaoDeContraste } from "./contraste";

describe("ehCorHex", () => {
  it.each(["#000000", "#FFFFFF", "#0a98e7"])("aceita %s", (cor) => {
    expect(ehCorHex(cor)).toBe(true);
  });

  it.each(["000000", "#fff", "#12345g", "#1234567", "red", "url(x)", "#000000;color:red", "", null, undefined, 12])(
    "recusa %j",
    (cor) => {
      expect(ehCorHex(cor)).toBe(false);
    },
  );
});

describe("razaoDeContraste", () => {
  it("preto sobre branco é 21:1, e a ordem das cores não importa", () => {
    expect(razaoDeContraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(razaoDeContraste("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("cores iguais dão 1:1", () => {
    expect(razaoDeContraste("#336699", "#336699")).toBeCloseTo(1, 5);
  });

  it("bate com valores conhecidos do WCAG", () => {
    // Cinza #767676 sobre branco é o limite clássico de 4,54:1.
    expect(razaoDeContraste("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
    // O verde da marca (#178035) com branco, citado como 5,03:1 em globals.css.
    expect(razaoDeContraste("#178035", "#ffffff")).toBeCloseTo(5.03, 1);
  });

  it("as cores do modo para daltonismo passam de 4,5:1 com texto branco", () => {
    expect(razaoDeContraste("#b84a00", "#ffffff")).toBeGreaterThan(4.5);
    expect(razaoDeContraste("#0072b2", "#ffffff")).toBeGreaterThan(4.5);
  });

  it("o amarelo do destaque de palavra tem texto preto bem legível", () => {
    expect(razaoDeContraste("#000000", "#ffe14d")).toBeGreaterThan(15);
  });

  it("luminância vai de 0 (preto) a 1 (branco)", () => {
    expect(luminancia("#000000")).toBe(0);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("avaliarContraste", () => {
  it("classifica em AAA, AA e insuficiente", () => {
    expect(avaliarContraste("#000000", "#ffffff").nivel).toBe("AAA");
    expect(avaliarContraste("#767676", "#ffffff").nivel).toBe("AA");
    expect(avaliarContraste("#aaaaaa", "#ffffff").nivel).toBe("insuficiente");
  });

  it("com mínimo 3 (elementos que não são texto), só distingue AA de insuficiente", () => {
    expect(avaliarContraste("#949494", "#ffffff", 3).nivel).toBe("AA");
    expect(avaliarContraste("#cccccc", "#ffffff", 3).nivel).toBe("insuficiente");
  });
});

describe("formatarRazao", () => {
  it("usa vírgula e duas casas", () => {
    expect(formatarRazao(4.5)).toBe("4,50:1");
    expect(formatarRazao(21)).toBe("21,00:1");
  });
});
