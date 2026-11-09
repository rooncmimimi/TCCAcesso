import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { esquecerSondagens, LIMITE_DA_SONDAGEM_MS, LIMITE_DO_DETECTOR_MS, navegadorTraduz, tradutorComReserva } from "@/i18n/tradutorComReserva";
import { tradutorDoNavegador } from "@/i18n/tradutorDoNavegador";
import { tradutorOnline } from "@/i18n/tradutorOnline";

/**
 * A reserva existe por causa de um fato medido: no Chrome 152, `Translator` e `LanguageDetector` existem
 * como funções — então o Site achava que dava — e `availability()` nunca responde. O botão "Traduzir"
 * esperava 8 segundos e mandava a pessoa usar o menu do navegador.
 */

vi.mock("@/i18n/tradutorDoNavegador", async (original) => {
  const real = await original<typeof import("@/i18n/tradutorDoNavegador")>();

  return { ...real, tradutorDoNavegador: { disponivel: vi.fn(() => true), detectar: vi.fn(async () => null), traduzir: vi.fn(async (t: string[]) => t.map((x) => `[navegador] ${x}`)) } };
});

vi.mock("@/i18n/tradutorOnline", () => ({
  tradutorOnline: { disponivel: () => true, detectar: vi.fn(async () => null), traduzir: vi.fn(async (t: string[]) => t.map((x) => `[online] ${x}`)) },
}));

/** Finge a API do navegador com a resposta que o teste quiser (ou com uma promessa que nunca resolve). */
function fingirNavegador(availability: (() => Promise<string>) | null) {
  if (!availability) {
    Reflect.deleteProperty(globalThis, "Translator");

    return;
  }

  Object.defineProperty(globalThis, "Translator", { value: { availability }, configurable: true });
}

beforeEach(() => {
  esquecerSondagens();
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, "Translator");
});

describe("quando o tradutor do navegador serve", () => {
  it("pronto para o par de idiomas: traduz no aparelho e o texto não sai dele", async () => {
    fingirNavegador(async () => "available");

    await expect(navegadorTraduz("pt", "en")).resolves.toBe(true);
    await expect(tradutorComReserva.traduzir(["olá"], "pt", "en")).resolves.toEqual(["[navegador] olá"]);
    await expect(tradutorComReserva.saiDoAparelho?.("pt", "en")).resolves.toBe(false);
    expect(tradutorOnline.traduzir).not.toHaveBeenCalled();
  });

  it("a sondagem é feita uma vez por par: não pergunta de novo a cada clique", async () => {
    const availability = vi.fn(async () => "available");

    fingirNavegador(availability);

    await navegadorTraduz("pt", "en");
    await navegadorTraduz("pt", "en");

    expect(availability).toHaveBeenCalledTimes(1);
  });
});

describe("quando o tradutor do navegador não serve", () => {
  it("navegador sem a API: vai direto para a reserva", async () => {
    fingirNavegador(null);

    await expect(tradutorComReserva.traduzir(["olá"], "pt", "en")).resolves.toEqual(["[online] olá"]);
    await expect(tradutorComReserva.saiDoAparelho?.("pt", "en")).resolves.toBe(true);
  });

  it("a API existe mas nunca responde (o caso real do Chrome 152): desiste rápido e traduz pela reserva", async () => {
    fingirNavegador(() => new Promise<string>(() => {}));

    const resposta = navegadorTraduz("pt", "es");

    await vi.advanceTimersByTimeAsync(LIMITE_DA_SONDAGEM_MS);

    await expect(resposta).resolves.toBe(false);
  });

  it("o modelo do idioma ainda precisa ser baixado: a reserva traduz agora, em vez de esperar minutos", async () => {
    fingirNavegador(async () => "downloadable");

    await expect(navegadorTraduz("pt", "en")).resolves.toBe(false);
    await expect(tradutorComReserva.traduzir(["olá"], "pt", "en")).resolves.toEqual(["[online] olá"]);
  });

  it("o navegador prometeu e falhou no meio: a reserva ainda salva a tradução", async () => {
    fingirNavegador(async () => "available");
    vi.mocked(tradutorDoNavegador.traduzir).mockRejectedValueOnce(new Error("deu ruim"));

    await expect(tradutorComReserva.traduzir(["olá"], "pt", "en")).resolves.toEqual(["[online] olá"]);
  });
});

describe("descobrir o idioma do texto", () => {
  it("o palpite local responde na hora, sem depender do navegador", async () => {
    fingirNavegador(null);

    await expect(tradutorComReserva.detectar("This is a job posting written in English for everyone to read")).resolves.toBe("en");
    expect(tradutorDoNavegador.detectar).not.toHaveBeenCalled();
  });

  it("texto curto demais para o palpite: pergunta ao navegador, mas com prazo", async () => {
    fingirNavegador(null);
    vi.mocked(tradutorDoNavegador.detectar).mockReturnValueOnce(new Promise(() => {}));

    const resposta = tradutorComReserva.detectar("ok");

    await vi.advanceTimersByTimeAsync(LIMITE_DO_DETECTOR_MS);

    await expect(resposta).resolves.toBeNull();
  });
});
