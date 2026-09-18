import { coresEscuras, coresClaras } from "../cores";

/**
 * Fórmula do WCAG 2.x para razão de contraste, usada aqui para impedir que as cores corrigidas
 * voltem a falhar.
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

describe("contraste", () => {
  it("border tem pelo menos 3:1 contra a surface — WCAG 1.4.11, obrigatório porque CampoTexto usa a MESMA cor de fundo do Cartao que o contém, só a borda separa os dois visualmente", () => {
    expect(razaoDeContraste(coresClaras.border, coresClaras.surface)).toBeGreaterThanOrEqual(3);
    expect(razaoDeContraste(coresEscuras.border, coresEscuras.surface)).toBeGreaterThanOrEqual(3);
  });

  it("primary.onSoft (texto do Etiqueta de sucesso) tem pelo menos 4.5:1 contra o soft — WCAG 1.4.3, texto normal", () => {
    expect(razaoDeContraste(coresClaras.primary.onSoft, coresClaras.primary.soft)).toBeGreaterThanOrEqual(4.5);
    expect(razaoDeContraste(coresEscuras.primary.onSoft, coresEscuras.primary.soft)).toBeGreaterThanOrEqual(4.5);
  });

  it("todos os pares onSoft/soft dos tokens semânticos continuam com pelo menos 4.5:1, nos dois temas", () => {
    for (const colors of [coresClaras, coresEscuras]) {
      for (const variante of ["primary", "success", "warning", "error", "info"] as const) {
        const { soft, onSoft } = colors[variante];
        expect(razaoDeContraste(onSoft, soft)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
