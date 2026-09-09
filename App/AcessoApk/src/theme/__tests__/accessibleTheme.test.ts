import { DEFAULT_ACCESSIBILITY_PREFERENCES } from "../../accessibility/accessibilityDefaults";
import type { AccessibilityPreferences } from "../../accessibility/accessibilityTypes";
import { buildAccessibleTheme } from "../accessibleTheme";
import { darkColors, darkHighContrastColors, lightColors, lightHighContrastColors } from "../colors";
import { typography as baseTypography } from "../typography";

function comPreferencias(parciais: Partial<AccessibilityPreferences>): AccessibilityPreferences {
  return { ...DEFAULT_ACCESSIBILITY_PREFERENCES, ...parciais };
}

describe("buildAccessibleTheme", () => {
  it("sem nenhum ajuste, devolve as cores normais do modo (não a de alto contraste)", () => {
    const tema = buildAccessibleTheme("light", DEFAULT_ACCESSIBILITY_PREFERENCES, false);
    expect(tema.colors).toBe(lightColors);
  });

  it("highContrast troca para a paleta de alto contraste do modo certo", () => {
    const claro = buildAccessibleTheme("light", comPreferencias({ highContrast: true }), false);
    const escuro = buildAccessibleTheme("dark", comPreferencias({ highContrast: true }), false);

    expect(claro.colors).toBe(lightHighContrastColors);
    expect(escuro.colors).toBe(darkHighContrastColors);
    // Continua sendo uma VARIAÇÃO de light/dark, não um terceiro `mode`.
    expect(claro.mode).toBe("light");
    expect(escuro.mode).toBe("dark");
  });

  it("sem highContrast, dark usa a paleta escura normal (não a de alto contraste)", () => {
    const tema = buildAccessibleTheme("dark", DEFAULT_ACCESSIBILITY_PREFERENCES, false);
    expect(tema.colors).toBe(darkColors);
  });

  it("fontScale escala fontSize e lineHeight proporcionalmente, sem mudar fontWeight", () => {
    const pequena = buildAccessibleTheme("light", comPreferencias({ fontScale: "small" }), false);
    const media = buildAccessibleTheme("light", comPreferencias({ fontScale: "medium" }), false);
    const grande = buildAccessibleTheme("light", comPreferencias({ fontScale: "extraLarge" }), false);

    expect(media.typography.body.fontSize).toBe(baseTypography.body.fontSize);
    expect(pequena.typography.body.fontSize).toBeLessThan(media.typography.body.fontSize!);
    expect(grande.typography.body.fontSize).toBeGreaterThan(media.typography.body.fontSize!);
    expect(grande.typography.body.fontWeight).toBe(baseTypography.body.fontWeight);

    // A altura da linha cresce junto com a fonte — a proporção entre os
    // dois se mantém (a diferença de poucos centésimos vem só do
    // arredondamento em pixel inteiro, não de uma proporção menor de
    // verdade), nunca fica pequena a ponto de cortar o texto.
    const proporcaoBase = baseTypography.body.lineHeight! / baseTypography.body.fontSize!;
    const proporcaoEscalada = grande.typography.body.lineHeight! / grande.typography.body.fontSize!;
    expect(proporcaoEscalada).toBeGreaterThanOrEqual(proporcaoBase - 0.05);
  });

  it("letterSpacing 'normal' não adiciona nenhum espaçamento", () => {
    const tema = buildAccessibleTheme("light", comPreferencias({ letterSpacing: "normal" }), false);
    expect(tema.typography.body.letterSpacing).toBe(0);
  });

  it("letterSpacing 'wide' usa 0.12x o tamanho da fonte (referência do WCAG 1.4.12)", () => {
    const tema = buildAccessibleTheme("light", comPreferencias({ letterSpacing: "wide" }), false);
    const esperado = Math.round(tema.typography.body.fontSize! * 0.12 * 10) / 10;
    expect(tema.typography.body.letterSpacing).toBe(esperado);
  });

  it("lineHeightScale 'loose' aumenta o lineHeight além do que fontScale sozinho daria", () => {
    const normal = buildAccessibleTheme("light", comPreferencias({ lineHeightScale: "normal" }), false);
    const solto = buildAccessibleTheme("light", comPreferencias({ lineHeightScale: "loose" }), false);

    expect(solto.typography.body.lineHeight).toBeGreaterThan(normal.typography.body.lineHeight!);
  });

  it("reduceMotion efetivo (calculado fora) é o que aparece em theme.a11y, não a preferência bruta", () => {
    const tema = buildAccessibleTheme("light", comPreferencias({ reduceMotion: false }), true);
    expect(tema.a11y.reduceMotion).toBe(true);
  });

  it("enhancedFocus deixa o anel de foco mais espesso", () => {
    const normal = buildAccessibleTheme("light", comPreferencias({ enhancedFocus: false }), false);
    const realcado = buildAccessibleTheme("light", comPreferencias({ enhancedFocus: true }), false);

    expect(normal.a11y.focusRingWidth).toBe(2);
    expect(realcado.a11y.focusRingWidth).toBe(4);
  });
});
