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

  describe("dyslexiaFont (Rodada 2)", () => {
    it("sem a preferência ativa, nenhum token de tipografia recebe fontFamily", () => {
      const tema = buildAccessibleTheme("light", comPreferencias({ dyslexiaFont: false }), false, true);

      for (const token of Object.values(tema.typography)) {
        expect(token.fontFamily).toBeUndefined();
      }
    });

    it("com a preferência ativa mas a fonte ainda não carregada, fica sem efeito (não quebra com fontFamily inexistente)", () => {
      const tema = buildAccessibleTheme("light", comPreferencias({ dyslexiaFont: true }), false, false);

      for (const token of Object.values(tema.typography)) {
        expect(token.fontFamily).toBeUndefined();
      }
    });

    it("sem passar o 4º argumento (compatibilidade com chamadas antigas), o padrão é 'fonte não carregada'", () => {
      const tema = buildAccessibleTheme("light", comPreferencias({ dyslexiaFont: true }), false);
      expect(tema.typography.body.fontFamily).toBeUndefined();
    });

    it("com a preferência ativa E a fonte carregada, cada variante usa o Lexend do peso certo", () => {
      const tema = buildAccessibleTheme("light", comPreferencias({ dyslexiaFont: true }), false, true);

      expect(tema.typography.body.fontFamily).toBe("Lexend_400Regular"); // body: fontWeight 400
      expect(tema.typography.caption.fontFamily).toBe("Lexend_500Medium"); // caption: fontWeight 500
      expect(tema.typography.label.fontFamily).toBe("Lexend_600SemiBold"); // label: fontWeight 600
      expect(tema.typography.heading.fontFamily).toBe("Lexend_700Bold"); // heading: fontWeight 700
      expect(tema.typography.display.fontFamily).toBe("Lexend_800ExtraBold"); // display: fontWeight 800
    });

    it("dyslexiaFont não interfere em fontScale/letterSpacing/lineHeightScale — continuam calculados normalmente", () => {
      const semDislexia = buildAccessibleTheme(
        "light",
        comPreferencias({ dyslexiaFont: false, fontScale: "large", letterSpacing: "wide", lineHeightScale: "loose" }),
        false,
        true,
      );
      const comDislexia = buildAccessibleTheme(
        "light",
        comPreferencias({ dyslexiaFont: true, fontScale: "large", letterSpacing: "wide", lineHeightScale: "loose" }),
        false,
        true,
      );

      expect(comDislexia.typography.body.fontSize).toBe(semDislexia.typography.body.fontSize);
      expect(comDislexia.typography.body.lineHeight).toBe(semDislexia.typography.body.lineHeight);
      expect(comDislexia.typography.body.letterSpacing).toBe(semDislexia.typography.body.letterSpacing);
      // A única diferença é o fontFamily.
      expect(semDislexia.typography.body.fontFamily).toBeUndefined();
      expect(comDislexia.typography.body.fontFamily).toBe("Lexend_400Regular");
    });
  });
});
