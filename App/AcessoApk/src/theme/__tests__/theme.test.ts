import { darkColors, lightColors } from "../colors";
import { themes } from "../themes";

describe("temas", () => {
  it("existem os dois modos, claro e escuro", () => {
    expect(themes.light.mode).toBe("light");
    expect(themes.dark.mode).toBe("dark");
  });

  it("nenhum token de cor fica vazio ou indefinido", () => {
    for (const colors of [lightColors, darkColors]) {
      for (const [key, value] of Object.entries(colors)) {
        if (typeof value === "string") {
          expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
        } else {
          for (const [subKey, subValue] of Object.entries(value)) {
            // Nome do token no início da mensagem de falha, pra saber qual
            // par quebrou sem precisar abrir o arquivo de cores.
            expect(`${key}.${subKey}=${subValue}`).toMatch(/^[\w.]+=#[0-9A-Fa-f]{6}$/);
          }
        }
      }
    }
  });

  it("primary e success resolvem para a mesma cor hoje (mesmo sendo tokens distintos)", () => {
    expect(lightColors.primary).toEqual(lightColors.success);
    expect(darkColors.primary).toEqual(darkColors.success);
  });

  it("o texto sobre o amarelo sólido nunca é branco, em nenhum tema", () => {
    expect(lightColors.warning.onSolid.toLowerCase()).not.toBe("#ffffff");
    expect(darkColors.warning.onSolid.toLowerCase()).not.toBe("#ffffff");
  });

  it("o verde de ação fica mais claro no escuro, para manter contraste no fundo escuro", () => {
    expect(darkColors.primary.solid).not.toBe(lightColors.primary.solid);
  });
});
