import { describe, it, expect } from "vitest";

import { DICIONARIOS } from "./dicionarios";
import { IDIOMAS, ehIdioma, idiomaDoNavegador, localeDe, nomeDoIdioma } from "./idiomas";
import { traduzir } from "./traduzir";

describe("idiomas", () => {
  it("são três, com locale e nome escrito no próprio idioma", () => {
    expect(IDIOMAS.map((i) => i.codigo)).toEqual(["pt", "en", "es"]);
    expect(localeDe("pt")).toBe("pt-BR");
    expect(localeDe("en")).toBe("en-US");
    expect(localeDe("es")).toBe("es-ES");
    expect(nomeDoIdioma("en")).toBe("English");
    expect(nomeDoIdioma("es")).toBe("Español");
  });

  it("ehIdioma só aceita os três códigos exatos", () => {
    for (const ok of ["pt", "en", "es"]) expect(ehIdioma(ok)).toBe(true);
    for (const ruim of ["PT", "pt-BR", "fr", "", null, undefined, 1]) expect(ehIdioma(ruim)).toBe(false);
  });

  it.each([
    [["en-US", "pt-BR"], "en"],
    [["es-AR"], "es"],
    [["pt-PT"], "pt"],
    [["fr-FR", "es-ES"], "es"],
    [["fr-FR", "de"], "pt"],
    [[], "pt"],
  ])("idiomaDoNavegador(%j) = %s: o primeiro que o Site tem; senão português", (preferidos, esperado) => {
    expect(idiomaDoNavegador(preferidos as string[] | undefined)).toBe(esperado);
  });
});

describe("traduzir", () => {
  const dic = {
    "a.simples": "Olá",
    "a.nome": "Olá, {nome}!",
    "a.itens": "{n} itens",
    "a.itens_um": "{n} item",
  };

  it("devolve o texto da chave", () => {
    expect(traduzir(dic, "pt", "a.simples")).toBe("Olá");
  });

  it("preenche as variáveis, e uma variável que falta fica como está", () => {
    expect(traduzir(dic, "pt", "a.nome", { nome: "Ana" })).toBe("Olá, Ana!");
    expect(traduzir(dic, "pt", "a.nome", {})).toBe("Olá, {nome}!");
  });

  it("plural: só o 1 é singular; 0 é plural", () => {
    expect(traduzir(dic, "pt", "a.itens", { n: 1 })).toBe("1 item");
    expect(traduzir(dic, "pt", "a.itens", { n: 0 })).toBe("0 itens");
    expect(traduzir(dic, "pt", "a.itens", { n: 2 })).toBe("2 itens");
  });

  it("chave que não existe devolve a própria chave (aparece, em vez de sumir)", () => {
    expect(traduzir(dic, "pt", "nao.existe")).toBe("nao.existe");
  });

  it("a variável é substituída uma vez só, sem reinterpretar o valor", () => {
    expect(traduzir(dic, "pt", "a.nome", { nome: "{nome}" })).toBe("Olá, {nome}!");
  });
});

describe("os dicionários", () => {
  const chaves = Object.keys(DICIONARIOS.pt).sort();
  const variaveis = (texto: string) => [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

  it.each(["en", "es"] as const)("%s tem EXATAMENTE as mesmas chaves do português", (idioma) => {
    expect(Object.keys(DICIONARIOS[idioma]).sort()).toEqual(chaves);
  });

  it.each(["pt", "en", "es"] as const)("%s: nenhum texto vazio", (idioma) => {
    for (const [chave, texto] of Object.entries(DICIONARIOS[idioma])) expect(texto.trim(), chave).not.toBe("");
  });

  it.each(["en", "es"] as const)("%s: cada texto usa as mesmas variáveis do português", (idioma) => {
    for (const chave of chaves) {
      const pt = DICIONARIOS.pt[chave as keyof typeof DICIONARIOS.pt];
      const outro = DICIONARIOS[idioma][chave as keyof typeof DICIONARIOS.pt];

      expect(variaveis(outro), `${idioma}:${chave}`).toEqual(variaveis(pt));
    }
  });

  it("toda chave plural (_um) tem a forma base, para o plural não cair numa chave inexistente", () => {
    for (const chave of chaves.filter((c) => c.endsWith("_um"))) expect(chaves, chave).toContain(chave.replace(/_um$/, ""));
  });

  it("em inglês e espanhol, textos que aparecem na tela não ficaram iguais ao português por esquecimento", () => {
    const iguais = ["pt", "en", "es"].length; // só para documentar: nomes próprios e palavras iguais existem, então o limite é folgado
    const mesmoTexto = chaves.filter((c) => DICIONARIOS.en[c as keyof typeof DICIONARIOS.pt] === DICIONARIOS.pt[c as keyof typeof DICIONARIOS.pt]);

    expect(iguais).toBe(3);
    expect(mesmoTexto.length / chaves.length).toBeLessThan(0.15);
  });
});
