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

  describe("fontes da marca (redesign visual — unificação com o Site)", () => {
    it("com as fontes carregadas e sem dyslexiaFont, cada variante usa a família certa (títulos: Plus Jakarta Sans; corpo: Manrope)", () => {
      const tema = buildAccessibleTheme("light", DEFAULT_ACCESSIBILITY_PREFERENCES, false, false, true);

      expect(tema.typography.display.fontFamily).toBe("PlusJakartaSans_800ExtraBold");
      expect(tema.typography.heading.fontFamily).toBe("PlusJakartaSans_700Bold");
      expect(tema.typography.title.fontFamily).toBe("PlusJakartaSans_700Bold");
      expect(tema.typography.body.fontFamily).toBe("Manrope_400Regular");
      expect(tema.typography.bodySmall.fontFamily).toBe("Manrope_400Regular");
      expect(tema.typography.caption.fontFamily).toBe("Manrope_500Medium");
      expect(tema.typography.label.fontFamily).toBe("Manrope_600SemiBold");
      expect(tema.typography.button.fontFamily).toBe("Manrope_700Bold");
    });

    it("com as fontes da marca ainda não carregadas, fica sem fontFamily (não quebra, cai na fonte da plataforma)", () => {
      const tema = buildAccessibleTheme("light", DEFAULT_ACCESSIBILITY_PREFERENCES, false, false, false);

      for (const token of Object.values(tema.typography)) {
        expect(token.fontFamily).toBeUndefined();
      }
    });

    it("dyslexiaFont ativo vence a fonte da marca, mesmo com as duas carregadas", () => {
      const tema = buildAccessibleTheme(
        "light",
        comPreferencias({ dyslexiaFont: true }),
        false,
        true,
        true,
      );

      expect(tema.typography.body.fontFamily).toBe("Lexend_400Regular");
      expect(tema.typography.display.fontFamily).toBe("Lexend_800ExtraBold");
    });

    it("sem passar o 5º argumento (compatibilidade com chamadas antigas), o padrão é 'fonte da marca não carregada'", () => {
      const tema = buildAccessibleTheme("light", DEFAULT_ACCESSIBILITY_PREFERENCES, false, false);
      expect(tema.typography.body.fontFamily).toBeUndefined();
    });
  });

  // Rodada 3, item 30 — as 7 preferências que alteram o tema mexem em partes
  // independentes do objeto (`colors` só depende de `highContrast`/`mode`;
  // `a11y` só de `reduceMotion` efetivo/`enhancedFocus`; `typography` só de
  // `fontScale`/`letterSpacing`/`lineHeightScale`/`dyslexiaFont`) — nenhuma
  // lê ou decide a partir do resultado de outra. Este teste liga as 7 ao
  // mesmo tempo (o pior caso: nunca testado junto antes) só para confirmar
  // que combiná-las não quebra nenhum cálculo isolado.
  it("combinando as 7 preferências ao mesmo tempo, cada cálculo continua correto isoladamente", () => {
    const tudoLigado = comPreferencias({
      highContrast: true,
      fontScale: "extraLarge",
      letterSpacing: "wide",
      lineHeightScale: "loose",
      dyslexiaFont: true,
      reduceMotion: true,
      enhancedFocus: true,
    });
    // `effectiveReduceMotion` (3º argumento) é sempre pré-calculado fora
    // desta função (preferência OU sinal do sistema) — aqui `true` porque
    // `tudoLigado.reduceMotion` também é `true`, mesmo raciocínio do teste
    // "reduceMotion efetivo" acima.
    const tema = buildAccessibleTheme("dark", tudoLigado, true, true);

    // Cores: alto contraste do modo escuro, não uma mistura dos dois.
    expect(tema.colors).toBe(darkHighContrastColors);

    // Tipografia: fontScale (extraLarge = 1.3x) aplicado.
    expect(tema.typography.body.fontSize).toBe(Math.round(baseTypography.body.fontSize! * 1.3));
    // letterSpacing (wide = 0.12x do fontSize já escalado).
    expect(tema.typography.body.letterSpacing).toBe(Math.round(tema.typography.body.fontSize! * 0.12 * 10) / 10);
    // lineHeightScale (loose) aumenta o lineHeight além do que só fontScale daria.
    const soComFontScale = Math.round(baseTypography.body.lineHeight! * 1.3);
    expect(tema.typography.body.lineHeight!).toBeGreaterThan(soComFontScale);
    // dyslexiaFont: fontFamily do peso certo, mesmo com todo o resto ligado.
    expect(tema.typography.body.fontFamily).toBe("Lexend_400Regular");

    // a11y: reduceMotion efetivo (passado já calculado) e o anel de foco ampliado.
    expect(tema.a11y.reduceMotion).toBe(true);
    expect(tema.a11y.enhancedFocus).toBe(true);
    expect(tema.a11y.focusRingWidth).toBe(4);
  });
});
