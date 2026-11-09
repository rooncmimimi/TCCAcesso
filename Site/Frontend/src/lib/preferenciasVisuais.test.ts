import { describe, it, expect } from "vitest";

import { PREFERENCIAS_PADRAO, type PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";
import { ajustesVisuais, limparCores, normalizarVisual, visualPadrao } from "./preferenciasVisuais";

/**
 * O que chega do localStorage não é confiável: pode vir de uma versão antiga, ter sido editado à
 * mão ou estar corrompido. E quem tinha o interruptor antigo ligado não pode perder o que
 * escolheu só porque o recurso cresceu.
 */

const com = (parcial: Partial<PreferenciasAcessibilidade>) =>
  ({ ...PREFERENCIAS_PADRAO, ...parcial }) as PreferenciasAcessibilidade;

describe("migração do interruptor antigo", () => {
  it("quem tinha 'modo para daltonismo' ligado passa a usar o Padrão acessível", () => {
    const visual = normalizarVisual(com({ colorBlind: true }), PREFERENCIAS_PADRAO);

    expect(visual.visualPattern).toBe("acessivel");
    expect(visual.colorBlind).toBe(false);
  });

  it("quem já escolheu um padrão não é mexido", () => {
    const visual = normalizarVisual(
      com({ colorBlind: true, visualPattern: "tritanopia" }),
      PREFERENCIAS_PADRAO,
    );

    expect(visual.visualPattern).toBe("tritanopia");
  });

  it("quem nunca ligou nada continua sem padrão", () => {
    expect(normalizarVisual(com({}), PREFERENCIAS_PADRAO).visualPattern).toBe("nenhum");
  });
});

describe("o que vem do armazenamento é conferido", () => {
  it("padrão inventado volta para 'nenhum'", () => {
    const visual = normalizarVisual(
      com({ visualPattern: "url(javascript:alert(1))" as never }),
      PREFERENCIAS_PADRAO,
    );

    expect(visual.visualPattern).toBe("nenhum");
  });

  it("números fora da faixa são presos nos limites", () => {
    const visual = normalizarVisual(
      com({ visualIntensity: 999, visualSaturation: -40, visualBrightness: 1000 }),
      PREFERENCIAS_PADRAO,
    );

    expect(visual.visualIntensity).toBe(100);
    expect(visual.visualSaturation).toBe(0);
    expect(visual.visualBrightness).toBe(130);
  });

  it("número que não é número volta ao padrão", () => {
    const visual = normalizarVisual(com({ visualIntensity: "muito" as never }), PREFERENCIAS_PADRAO);

    expect(visual.visualIntensity).toBe(PREFERENCIAS_PADRAO.visualIntensity);
  });

  it("contraste fora da lista volta para 4,5", () => {
    expect(normalizarVisual(com({ visualContrast: 2 }), PREFERENCIAS_PADRAO).visualContrast).toBe(4.5);
    expect(normalizarVisual(com({ visualContrast: 7 }), PREFERENCIAS_PADRAO).visualContrast).toBe(7);
  });
});

describe("limparCores", () => {
  it("guarda só papel conhecido com cor #rrggbb", () => {
    expect(
      limparCores({
        sucesso: "#0072b2",
        erro: "red",
        alerta: "#fff",
        inventado: "#000000",
        info: "#6a3d9a",
      }),
    ).toEqual({ sucesso: "#0072b2", info: "#6a3d9a" });
  });

  it("recusa o que nem objeto é", () => {
    expect(limparCores(null)).toEqual({});
    expect(limparCores("#0072b2")).toEqual({});
    expect(limparCores(42)).toEqual({});
  });

  it("não deixa passar uma 'cor' que seria CSS", () => {
    expect(limparCores({ sucesso: "var(--x); background: url(http://exemplo)" })).toEqual({});
  });
});

describe("ajustesVisuais e visualPadrao", () => {
  it("monta os ajustes a partir das preferências", () => {
    expect(
      ajustesVisuais(com({ visualIntensity: 60, visualSaturation: 80, visualBrightness: 110, visualContrast: 7 })),
    ).toEqual({ intensidade: 60, saturacao: 80, brilho: 110, contraste: 7, cores: {} });
  });

  it("o padrão da seção é tudo neutro e nenhum padrão", () => {
    expect(visualPadrao()).toEqual({
      visualPattern: "nenhum",
      visualIntensity: 100,
      visualSaturation: 100,
      visualBrightness: 100,
      visualContrast: 4.5,
      visualColors: {},
    });
  });
});
