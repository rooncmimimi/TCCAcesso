import { describe, it, expect } from "vitest";

import {
  IDS_DOS_PADROES,
  PADROES_VISUAIS,
  VARIAVEIS_DOS_PADROES,
  ehIdDePadrao,
  paletaDoPadrao,
  variaveisDoPadrao,
  type IdDoPadrao,
  type PapelDeCor,
} from "./padroesVisuais";
import { ehCorHex, razaoDeContraste } from "./contraste";

/**
 * Este arquivo refaz, a cada execução, a conta que decidiu cada cor das paletas. Uma cor nova que
 * não aguente o próprio texto, ou que suma contra o fundo da página, quebra o teste aqui — e não na
 * tela de alguém.
 *
 * Os fundos são os do card, onde os selos de status de fato aparecem: branco no tema claro e
 * `oklch(0.235 0.025 260)` no escuro, que é `#171e2a`.
 */

const FUNDO = { claro: "#ffffff", escuro: "#171e2a" } as const;

const PADROES = Object.values(PADROES_VISUAIS);
const TEMAS = ["claro", "escuro"] as const;

/** Cada combinação padrão × tema × papel, achatada, para o `it.each` falar o nome do que falhou. */
const CASOS = PADROES.flatMap((padrao) =>
  TEMAS.flatMap((tema) =>
    (Object.entries(padrao[tema]) as [PapelDeCor, { fundo: string; texto: string }][]).map(
      ([papel, par]) => ({ padrao: padrao.id, tema, papel, ...par }),
    ),
  ),
);

describe("padrões visuais: as cores aguentam o próprio texto (WCAG 1.4.3)", () => {
  it.each(CASOS)("$padrao / $tema / $papel: $fundo com $texto", ({ fundo, texto }) => {
    expect(razaoDeContraste(fundo, texto)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("padrões visuais: as cores aparecem contra o fundo da página (WCAG 1.4.11)", () => {
  it.each(CASOS)("$padrao / $tema / $papel: $fundo sobre o card", ({ fundo, tema }) => {
    expect(razaoDeContraste(fundo, FUNDO[tema])).toBeGreaterThanOrEqual(3);
  });
});

describe("padrões visuais: a tabela", () => {
  it.each(CASOS)("$padrao / $tema / $papel usa cor em #rrggbb", ({ fundo, texto }) => {
    expect(ehCorHex(fundo)).toBe(true);
    expect(ehCorHex(texto)).toBe(true);
  });

  it("todo padrão define os quatro estados nos dois temas", () => {
    for (const padrao of PADROES) {
      for (const tema of TEMAS) {
        expect(Object.keys(padrao[tema]).sort()).toEqual(
          expect.arrayContaining(["alerta", "erro", "info", "sucesso"]),
        );
      }
    }
  });

  it("nos padrões com cor, os quatro estados têm preenchimentos diferentes entre si", () => {
    for (const padrao of PADROES.filter((p) => p.id !== "monocromatico")) {
      for (const tema of TEMAS) {
        const fundos = (["sucesso", "erro", "alerta", "info"] as const).map((papel) => padrao[tema][papel]?.fundo);

        expect(new Set(fundos).size, `${padrao.id} / ${tema}`).toBe(4);
      }
    }
  });

  it("no monocromático os quatro estados são iguais de propósito: quem separa é o ícone e o texto", () => {
    for (const tema of TEMAS) {
      const fundos = (["sucesso", "erro", "alerta", "info"] as const).map(
        (papel) => PADROES_VISUAIS.monocromatico[tema][papel]?.fundo,
      );

      expect(new Set(fundos).size).toBe(1);
    }
  });

  it("só o monocromático mexe na cor de destaque da marca", () => {
    for (const padrao of PADROES) {
      const mexe = Boolean(padrao.claro.destaque || padrao.escuro.destaque);

      expect(mexe, padrao.id).toBe(padrao.id === "monocromatico");
    }
  });
});

describe("variaveisDoPadrao", () => {
  it('"nenhum" não escreve variável nenhuma: o site fica com as cores da marca', () => {
    expect(variaveisDoPadrao("nenhum", false)).toEqual({});
    expect(variaveisDoPadrao("nenhum", true)).toEqual({});
  });

  it("um padrão sem destaque mexe nos quatro estados e deixa --primary em paz", () => {
    const variaveis = variaveisDoPadrao("acessivel", false);

    expect(variaveis["--success"]).toBe("#0072b2");
    expect(variaveis["--destructive"]).toBe("#c14300");
    expect(variaveis["--success-foreground"]).toBe("#ffffff");
    expect(variaveis["--primary"]).toBeUndefined();
    expect(variaveis["--ring"]).toBeUndefined();
  });

  it("o monocromático também apaga a cor do destaque e do contorno de foco", () => {
    const variaveis = variaveisDoPadrao("monocromatico", false);

    expect(variaveis["--primary"]).toBe("#334155");
    expect(variaveis["--ring"]).toBe("#334155");
    expect(variaveis["--primary-foreground"]).toBe("#ffffff");
  });

  it("o tema escuro usa a paleta escura", () => {
    expect(variaveisDoPadrao("acessivel", true)["--success"]).toBe("#56b4e9");
  });

  it("toda variável escrita está na lista que o provider usa para limpar", () => {
    for (const id of IDS_DOS_PADROES) {
      for (const escuro of [false, true]) {
        for (const nome of Object.keys(variaveisDoPadrao(id, escuro))) {
          expect(VARIAVEIS_DOS_PADROES, `${id} escreve ${nome}`).toContain(nome);
        }
      }
    }
  });
});

describe("ehIdDePadrao", () => {
  it.each(IDS_DOS_PADROES)("aceita %s", (id) => {
    expect(ehIdDePadrao(id)).toBe(true);
  });

  it.each([["acromatopsia"], [""], [null], [undefined], [42], [{}]])("recusa %s", (valor) => {
    expect(ehIdDePadrao(valor)).toBe(false);
  });
});

describe("paletaDoPadrao", () => {
  it("devolve a paleta do tema pedido, para as amostras da tela", () => {
    expect(paletaDoPadrao("tritanopia", false).sucesso?.fundo).toBe("#16772f");
    expect(paletaDoPadrao("tritanopia", true).sucesso?.fundo).toBe("#5fd08a");
  });

  it('"nenhum" mostra as cores da própria marca, para o cartão ter amostra também', () => {
    const paleta = paletaDoPadrao("nenhum" as IdDoPadrao, false);

    expect(paleta.sucesso?.fundo).toBeTruthy();
    expect(paleta.destaque?.fundo).toBeTruthy();
    expect(razaoDeContraste(paleta.sucesso!.fundo, paleta.sucesso!.texto)).toBeGreaterThanOrEqual(4.5);
  });
});
