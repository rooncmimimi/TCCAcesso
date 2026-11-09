import { afterEach, describe, expect, it, vi } from "vitest";

import { calarVozDoSite, comoLiberarOMicrofone, estadoDoMicrofone, idiomaDeEscuta, reconhecimentoDeFalaSuportado, soltarReconhecimento, type Reconhecimento } from "@/lib/microfone";

function reconhecimentoFalso(aoAbortar?: () => void): Reconhecimento {
  return {
    lang: "",
    continuous: false,
    interimResults: false,
    onresult: () => {},
    onerror: () => {},
    onend: () => {},
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(aoAbortar),
  };
}

function fingirAgente(agente: string) {
  Object.defineProperty(navigator, "userAgent", { value: agente, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(navigator, "permissions");
  Reflect.deleteProperty(navigator, "userAgent");
  document.documentElement.lang = "";
});

describe("o navegador oferece reconhecimento de fala?", () => {
  it("não, quando não existe nenhuma das duas formas (Firefox)", () => {
    expect(reconhecimentoDeFalaSuportado()).toBe(false);
  });

  it("sim, também pela forma antiga com prefixo (Safari, Edge mais velho)", () => {
    Object.defineProperty(window, "webkitSpeechRecognition", { value: class {}, configurable: true });

    expect(reconhecimentoDeFalaSuportado()).toBe(true);
  });
});

describe("o idioma em que o microfone escuta", () => {
  it("acompanha o site e leva a região: o Chrome erra muito mais com o idioma solto", () => {
    document.documentElement.lang = "en";

    expect(idiomaDeEscuta()).toBe("en-US");
  });

  it("português quando o site não diz nada", () => {
    expect(idiomaDeEscuta()).toBe("pt-BR");
  });
});

describe("soltar o reconhecimento", () => {
  it("tira os avisos antes de abortar: o fim da sessão velha não pode desligar a escuta nova", () => {
    const r = reconhecimentoFalso();

    soltarReconhecimento(r);

    expect(r.onresult).toBeNull();
    expect(r.onerror).toBeNull();
    expect(r.onend).toBeNull();
    expect(r.abort).toHaveBeenCalled();
  });

  it("aguenta o abort estourar (sessão que o navegador já fechou) e não ter sessão nenhuma", () => {
    const r = reconhecimentoFalso(() => {
      throw new Error("InvalidStateError");
    });

    expect(() => soltarReconhecimento(r)).not.toThrow();
    expect(() => soltarReconhecimento(null)).not.toThrow();
  });
});

describe("calar a voz do próprio site", () => {
  it("manda parar a leitura: senão o microfone ouve o site, não a pessoa", () => {
    const cancel = vi.fn();

    Object.defineProperty(window, "speechSynthesis", { value: { cancel }, configurable: true });
    calarVozDoSite();

    expect(cancel).toHaveBeenCalled();
  });

  it("não estoura em navegador sem síntese de fala", () => {
    expect(() => calarVozDoSite()).not.toThrow();
  });
});

describe("estado da permissão do microfone", () => {
  const fingirPermissao = (query: unknown) => Object.defineProperty(navigator, "permissions", { value: { query }, configurable: true });

  it("liberado, negado e ainda vai perguntar", async () => {
    fingirPermissao(vi.fn().mockResolvedValue({ state: "granted" }));
    await expect(estadoDoMicrofone()).resolves.toBe("liberado");

    fingirPermissao(vi.fn().mockResolvedValue({ state: "denied" }));
    await expect(estadoDoMicrofone()).resolves.toBe("negado");

    fingirPermissao(vi.fn().mockResolvedValue({ state: "prompt" }));
    await expect(estadoDoMicrofone()).resolves.toBe("vai-perguntar");
  });

  it("desconhecido quando o navegador não aceita consultar (Firefox) ou não tem a API", async () => {
    fingirPermissao(
      vi.fn().mockRejectedValue(new TypeError("microphone não é um nome de permissão")),
    );
    await expect(estadoDoMicrofone()).resolves.toBe("desconhecido");

    Reflect.deleteProperty(navigator, "permissions");
    await expect(estadoDoMicrofone()).resolves.toBe("desconhecido");
  });
});

describe("onde liberar o microfone", () => {
  it("fala de cadeado no computador, de permissões no Android e dos ajustes no iPhone", () => {
    fingirAgente("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140");
    expect(comoLiberarOMicrofone()).toMatch(/cadeado/i);

    fingirAgente("Mozilla/5.0 (Linux; Android 14) Chrome/140 Mobile");
    expect(comoLiberarOMicrofone()).toMatch(/permiss/i);

    fingirAgente("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari");
    expect(comoLiberarOMicrofone()).toMatch(/ajustes/i);
  });
});
