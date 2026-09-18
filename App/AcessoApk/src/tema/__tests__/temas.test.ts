import { coresEscuras, coresClaras } from "../cores";
import { temas } from "../temas";

describe("temas", () => {
  it("existem os dois modos, claro e escuro", () => {
    expect(temas.light.mode).toBe("light");
    expect(temas.dark.mode).toBe("dark");
  });

  it("nenhum token de cor fica vazio ou indefinido", () => {
    for (const colors of [coresClaras, coresEscuras]) {
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
    expect(coresClaras.primary).toEqual(coresClaras.success);
    expect(coresEscuras.primary).toEqual(coresEscuras.success);
  });

  it("o texto sobre o amarelo sólido nunca é branco, em nenhum tema", () => {
    expect(coresClaras.warning.onSolid.toLowerCase()).not.toBe("#ffffff");
    expect(coresEscuras.warning.onSolid.toLowerCase()).not.toBe("#ffffff");
  });

  it("o verde de ação fica mais claro no escuro, para manter contraste no fundo escuro", () => {
    expect(coresEscuras.primary.solid).not.toBe(coresClaras.primary.solid);
  });
});
