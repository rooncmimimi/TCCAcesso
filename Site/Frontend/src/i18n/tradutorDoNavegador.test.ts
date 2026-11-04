import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * O motor real: as APIs `Translator` e `LanguageDetector` do navegador, aqui simuladas em `globalThis`. Cada teste recarrega o módulo
 * (ele guarda tradutores e detector em cache).
 */

type Alvo = Record<string, unknown>;
const alvo = globalThis as unknown as Alvo;

async function carregar() {
  vi.resetModules();

  return import("./tradutorDoNavegador");
}

function instalarTradutor(disponibilidade: "available" | "downloadable" | "downloading" | "unavailable" = "available") {
  const traduzir = vi.fn(async (texto: string) => `T(${texto})`);
  const criar = vi.fn(async () => ({ translate: traduzir }));
  const disponivel = vi.fn(async () => disponibilidade);

  alvo.Translator = { availability: disponivel, create: criar };

  return { traduzir, criar, disponivel };
}

function instalarDetector(resultado: { detectedLanguage: string; confidence: number }[]) {
  const detectar = vi.fn(async () => resultado);

  alvo.LanguageDetector = { create: vi.fn(async () => ({ detect: detectar })) };

  return detectar;
}

beforeEach(() => {
  delete alvo.Translator;
  delete alvo.LanguageDetector;
});

afterEach(() => {
  delete alvo.Translator;
  delete alvo.LanguageDetector;
});

describe("disponivel", () => {
  it("só com a API Translator presente", async () => {
    const { tradutorDoNavegador } = await carregar();

    expect(tradutorDoNavegador.disponivel()).toBe(false);

    instalarTradutor();

    expect(tradutorDoNavegador.disponivel()).toBe(true);
  });
});

describe("detectar", () => {
  it("devolve o idioma quando é um dos três e a confiança é alta", async () => {
    instalarDetector([{ detectedLanguage: "en", confidence: 0.93 }]);
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.detectar("This is clearly an English sentence")).toBe("en");
  });

  it("variante regional vira o idioma base", async () => {
    instalarDetector([{ detectedLanguage: "pt-BR", confidence: 0.9 }]);
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.detectar("Esta é uma frase em português")).toBe("pt");
  });

  it.each([
    ["confiança baixa", [{ detectedLanguage: "en", confidence: 0.3 }]],
    ["idioma que o Site não tem", [{ detectedLanguage: "fr", confidence: 0.99 }]],
    ["sem resultado", []],
  ])("%s: não sabe (null)", async (_nome, resultado) => {
    instalarDetector(resultado);
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.detectar("Alguma frase razoavelmente longa")).toBeNull();
  });

  it("texto curto demais: nem chama o detector", async () => {
    const detectar = instalarDetector([{ detectedLanguage: "en", confidence: 0.99 }]);
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.detectar("ok")).toBeNull();
    expect(detectar).not.toHaveBeenCalled();
  });

  it("sem detector, ou detector que falha: null, nunca erro", async () => {
    const { tradutorDoNavegador } = await carregar();
    expect(await tradutorDoNavegador.detectar("Uma frase longa o bastante")).toBeNull();

    alvo.LanguageDetector = { create: vi.fn(async () => Promise.reject(new Error("sem modelo"))) };
    const outro = await carregar();
    expect(await outro.tradutorDoNavegador.detectar("Uma frase longa o bastante")).toBeNull();
  });
});

describe("traduzir", () => {
  it("traduz cada texto, na mesma ordem, e reaproveita o tradutor do mesmo par", async () => {
    const { traduzir, criar } = instalarTradutor();
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.traduzir(["um", "dois"], "en", "pt")).toEqual(["T(um)", "T(dois)"]);
    await tradutorDoNavegador.traduzir(["tres"], "en", "pt");

    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar).toHaveBeenCalledWith({ sourceLanguage: "en", targetLanguage: "pt" });
    expect(traduzir).toHaveBeenCalledTimes(3);
  });

  it("texto vazio não vai ao tradutor", async () => {
    const { traduzir } = instalarTradutor();
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.traduzir(["", "  ", "oi"], "en", "pt")).toEqual(["", "  ", "T(oi)"]);
    expect(traduzir).toHaveBeenCalledTimes(1);
  });

  it("modelo ainda não baixado: avisa (aoPreparar) antes de traduzir", async () => {
    instalarTradutor("downloadable");
    const { tradutorDoNavegador } = await carregar();
    const aoPreparar = vi.fn();

    await tradutorDoNavegador.traduzir(["oi"], "en", "pt", aoPreparar);

    expect(aoPreparar).toHaveBeenCalledOnce();
  });

  it("modelo já disponível: não avisa de preparo", async () => {
    instalarTradutor("available");
    const { tradutorDoNavegador } = await carregar();
    const aoPreparar = vi.fn();

    await tradutorDoNavegador.traduzir(["oi"], "en", "pt", aoPreparar);

    expect(aoPreparar).not.toHaveBeenCalled();
  });

  it("par de idiomas que o navegador não tem: par_indisponivel", async () => {
    instalarTradutor("unavailable");
    const { tradutorDoNavegador } = await carregar();

    await expect(tradutorDoNavegador.traduzir(["oi"], "en", "pt")).rejects.toMatchObject({ codigo: "par_indisponivel" });
  });

  it("sem a API: nao_suportado", async () => {
    const { tradutorDoNavegador } = await carregar();

    await expect(tradutorDoNavegador.traduzir(["oi"], "en", "pt")).rejects.toMatchObject({ codigo: "nao_suportado" });
  });

  it("falha ao traduzir vira 'falhou', e a falha de criação não fica guardada: a próxima tentativa recomeça", async () => {
    const criar = vi.fn().mockRejectedValueOnce(new Error("sem espaço")).mockResolvedValue({ translate: async (t: string) => `T(${t})` });
    alvo.Translator = { availability: async () => "available", create: criar };
    const { tradutorDoNavegador } = await carregar();

    await expect(tradutorDoNavegador.traduzir(["oi"], "en", "pt")).rejects.toMatchObject({ codigo: "falhou" });
    expect(await tradutorDoNavegador.traduzir(["oi"], "en", "pt")).toEqual(["T(oi)"]);
    expect(criar).toHaveBeenCalledTimes(2);
  });
});

describe("o navegador que não responde (a API existe, o motor não)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("availability que nunca resolve: depois de 8 s vira nao_suportado, em vez de travar a tela", async () => {
    alvo.Translator = { availability: () => new Promise(() => undefined), create: vi.fn() };
    const { tradutorDoNavegador, LIMITE_DA_DISPONIBILIDADE_MS } = await carregar();

    const resultado = tradutorDoNavegador.traduzir(["oi"], "en", "pt");
    const esperado = expect(resultado).rejects.toMatchObject({ codigo: "nao_suportado" });

    await vi.advanceTimersByTimeAsync(LIMITE_DA_DISPONIBILIDADE_MS + 1);
    await esperado;
  });

  it("tradução que nunca termina (modelo já disponível): depois de 30 s vira 'falhou'", async () => {
    alvo.Translator = { availability: async () => "available", create: async () => ({ translate: () => new Promise(() => undefined) }) };
    const { tradutorDoNavegador, LIMITE_DE_TRADUCAO_MS } = await carregar();

    const resultado = tradutorDoNavegador.traduzir(["oi"], "en", "pt");
    const esperado = expect(resultado).rejects.toMatchObject({ codigo: "falhou" });

    await vi.advanceTimersByTimeAsync(LIMITE_DE_TRADUCAO_MS + 1);
    await esperado;
  });

  it("com download do modelo o limite é bem maior (não corta o download no meio)", async () => {
    let terminar: (v: string) => void = () => undefined;
    alvo.Translator = {
      availability: async () => "downloadable",
      create: async () => ({ translate: () => new Promise<string>((resolve) => (terminar = resolve)) }),
    };
    const { tradutorDoNavegador, LIMITE_DE_TRADUCAO_MS } = await carregar();

    const resultado = tradutorDoNavegador.traduzir(["oi"], "en", "pt");

    await vi.advanceTimersByTimeAsync(LIMITE_DE_TRADUCAO_MS * 2);
    terminar("pronto");

    expect(await resultado).toEqual(["pronto"]);
  });

  it("resposta a tempo não é cortada", async () => {
    instalarTradutor("available");
    const { tradutorDoNavegador } = await carregar();

    expect(await tradutorDoNavegador.traduzir(["oi"], "en", "pt")).toEqual(["T(oi)"]);
  });
});

describe("detector que não responde", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("depois de 5 s vale 'não sei' (null), para a tradução seguir com o palpite", async () => {
    alvo.LanguageDetector = { create: vi.fn(async () => ({ detect: () => new Promise(() => undefined) })) };
    const { tradutorDoNavegador, LIMITE_DA_DETECCAO_MS } = await carregar();

    const resultado = tradutorDoNavegador.detectar("Uma frase longa o bastante para detectar");

    await vi.advanceTimersByTimeAsync(LIMITE_DA_DETECCAO_MS + 1);

    expect(await resultado).toBeNull();
  });
});
