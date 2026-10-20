import { describe, expect, it } from "vitest";

import { escolherVoz } from "./vozFala";

function voz(lang: string, extra: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return { lang, name: lang, default: false, localService: true, voiceURI: lang, ...extra };
}

describe("escolherVoz", () => {
  it("prefere o locale exato ao mesmo idioma de outra região", () => {
    const pt = voz("pt-PT");
    const br = voz("pt-BR");
    expect(escolherVoz([pt, br], "pt-BR")).toBe(br);
  });

  it("aceita outra região do mesmo idioma quando não há o locale exato", () => {
    const mx = voz("es-MX");
    expect(escolherVoz([voz("en-US"), mx], "es-ES")).toBe(mx);
  });

  it("entre vozes equivalentes, escolhe a padrão do sistema", () => {
    const padrao = voz("en-US", { default: true });
    expect(escolherVoz([voz("en-US"), padrao], "en-US")).toBe(padrao);
  });

  it("aceita o formato com sublinhado que alguns navegadores usam", () => {
    const br = voz("pt_BR");
    expect(escolherVoz([br], "pt-BR")).toBe(br);
  });

  it("devolve null quando não há voz do idioma", () => {
    expect(escolherVoz([voz("en-US")], "pt-BR")).toBeNull();
    expect(escolherVoz([], "pt-BR")).toBeNull();
  });
});
