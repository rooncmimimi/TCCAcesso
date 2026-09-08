import { darkColors, lightColors } from "../colors";

/**
 * Fórmula oficial do WCAG 2.x para razão de contraste relativo — usada para
 * ENCONTRAR as cores corrigidas na Fase 7 (não estimadas a olho) e repetida
 * aqui só para impedir que os valores voltem a regredir no futuro.
 */
function hexParaRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminanciaRelativa([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function razaoDeContraste(hexA: string, hexB: string): number {
  const [claro, escuro] = [luminanciaRelativa(hexParaRgb(hexA)), luminanciaRelativa(hexParaRgb(hexB))].sort(
    (a, b) => b - a,
  );
  return (claro + 0.05) / (escuro + 0.05);
}

describe("contraste (Fase 7)", () => {
  it("border tem pelo menos 3:1 contra a surface — WCAG 1.4.11, obrigatório porque Input usa a MESMA cor de fundo do Card que o contém, só a borda separa os dois visualmente", () => {
    expect(razaoDeContraste(lightColors.border, lightColors.surface)).toBeGreaterThanOrEqual(3);
    expect(razaoDeContraste(darkColors.border, darkColors.surface)).toBeGreaterThanOrEqual(3);
  });

  it("primary.onSoft (texto do Badge de sucesso) tem pelo menos 4.5:1 contra o soft — WCAG 1.4.3, texto normal", () => {
    expect(razaoDeContraste(lightColors.primary.onSoft, lightColors.primary.soft)).toBeGreaterThanOrEqual(4.5);
    expect(razaoDeContraste(darkColors.primary.onSoft, darkColors.primary.soft)).toBeGreaterThanOrEqual(4.5);
  });

  it("todos os pares onSoft/soft dos tokens semânticos continuam com pelo menos 4.5:1, nos dois temas", () => {
    for (const colors of [lightColors, darkColors]) {
      for (const variante of ["primary", "success", "warning", "error", "info"] as const) {
        const { soft, onSoft } = colors[variante];
        expect(razaoDeContraste(onSoft, soft)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
