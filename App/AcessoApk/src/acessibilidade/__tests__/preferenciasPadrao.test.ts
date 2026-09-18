import { PREFERENCIAS_ACESSIBILIDADE_PADRAO } from "../preferenciasPadrao";

describe("PREFERENCIAS_ACESSIBILIDADE_PADRAO", () => {
  it("nenhuma opção começa ativada — o usuário opta por cada ajuste", () => {
    expect(PREFERENCIAS_ACESSIBILIDADE_PADRAO).toEqual({
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
    expect(PREFERENCIAS_ACESSIBILIDADE_PADRAO.themeMode).toBe("system");
  });
});
