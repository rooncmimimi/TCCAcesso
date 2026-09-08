import { DEFAULT_ACCESSIBILITY_PREFERENCES } from "../accessibilityDefaults";

describe("DEFAULT_ACCESSIBILITY_PREFERENCES", () => {
  it("nenhuma opção começa ativada — o usuário opta por cada ajuste", () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES).toEqual({
      themeMode: "system",
      highContrast: false,
      fontScale: "medium",
      letterSpacing: "normal",
      lineHeightScale: "normal",
      dyslexiaFont: false,
      largeCursor: false,
      reduceMotion: false,
      enhancedFocus: false,
      keyboardNavigation: false,
      voiceEnabled: false,
    });
  });

  it("o tema padrão segue o sistema (não força claro nem escuro)", () => {
    expect(DEFAULT_ACCESSIBILITY_PREFERENCES.themeMode).toBe("system");
  });
});
