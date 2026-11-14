import { afterEach, describe, expect, it, vi } from "vitest";

import { criarT } from "@/contexts/IdiomaContext";
import { DICIONARIOS } from "@/i18n/dicionarios";
import { IDIOMAS } from "@/i18n/idiomas";
import {
  calarVozDoSite,
  comoLiberarOMicrofone,
  ERRO_DESCONHECIDO_COMANDO,
  ERRO_DESCONHECIDO_DITADO,
  estadoDoMicrofone,
  idiomaDeEscuta,
  MENSAGENS_DE_ERRO,
  NADA_FOI_OUVIDO,
  NAO_LIGOU,
  reconhecimentoDeFalaSuportado,
  soltarReconhecimento,
  type Reconhecimento,
} from "@/lib/microfone";

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
  /**
   * Devolve a chave do aviso, e não o texto: o aviso entra dentro de uma frase traduzida, e antes o
   * pedaço em português aparecia no meio da frase em inglês ou em espanhol. Aqui se cobra a chave de
   * cada aparelho; que a chave exista nos três dicionários é o `traduzir.test` que garante.
   */
  it("escolhe o aviso conforme o aparelho: computador, Android e iPhone", () => {
    fingirAgente("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140");
    expect(comoLiberarOMicrofone()).toBe("acessibilidade.microfone.liberarNoComputador");

    fingirAgente("Mozilla/5.0 (Linux; Android 14) Chrome/140 Mobile");
    expect(comoLiberarOMicrofone()).toBe("acessibilidade.microfone.liberarNoAndroid");

    fingirAgente("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari");
    expect(comoLiberarOMicrofone()).toBe("acessibilidade.microfone.liberarNoIos");
  });

  it("cada aviso diz onde mexer, no idioma de quem lê", () => {
    const t = criarT("pt");

    fingirAgente("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140");
    expect(t(comoLiberarOMicrofone())).toMatch(/cadeado/i);

    fingirAgente("Mozilla/5.0 (Linux; Android 14) Chrome/140 Mobile");
    expect(t(comoLiberarOMicrofone())).toMatch(/permiss/i);

    fingirAgente("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari");
    expect(t(comoLiberarOMicrofone())).toMatch(/ajustes/i);

    const emIngles = criarT("en");

    fingirAgente("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140");
    expect(emIngles(comoLiberarOMicrofone())).toMatch(/padlock/i);
  });
});

describe("as mensagens do microfone são chaves, e não texto", () => {
  /**
   * Estas constantes são de módulo: avaliadas quando o arquivo carrega, antes de existir idioma
   * escolhido. Com o texto dentro, o aviso saía em português para quem lia o site em inglês ou em
   * espanhol — e aconteceu: a pessoa via a tela toda em inglês e o erro do ditado em português.
   * Guardando a chave, quem traduz é o hook, que é React. Este teste é o que impede a volta disso.
   */
  const chaves = [...Object.values(MENSAGENS_DE_ERRO), NADA_FOI_OUVIDO, NAO_LIGOU, ERRO_DESCONHECIDO_DITADO, ERRO_DESCONHECIDO_COMANDO];

  it("nenhuma delas é uma frase pronta", () => {
    for (const chave of chaves) expect(chave).toMatch(/^acessibilidade.microfone.[a-zA-Z]+$/);
  });

  it("todas existem nos três idiomas, com texto diferente em cada um", () => {
    const avisos = ["acessibilidade.microfone.liberarNoAndroid", "acessibilidade.microfone.liberarNoIos", "acessibilidade.microfone.liberarNoComputador"] as const;

    for (const chave of [...chaves, ...avisos]) {
      const textos = IDIOMAS.map(({ codigo }) => DICIONARIOS[codigo][chave]);

      for (const texto of textos) expect(texto, chave).toBeTruthy();

      // Três idiomas, três textos: um valor repetido é tradução que ficou faltando.
      expect(new Set(textos).size, chave).toBe(IDIOMAS.length);
    }
  });
});
