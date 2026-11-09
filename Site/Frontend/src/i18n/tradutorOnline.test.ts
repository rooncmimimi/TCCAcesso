import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErroDeTraducao } from "@/i18n/tradutorDoNavegador";
import { destrocarEntidades, LIMITE_DE_BYTES, MAXIMO_DE_PEDACOS, partirTexto, tradutorOnline } from "@/i18n/tradutorOnline";

const bytes = (t: string) => new TextEncoder().encode(t).length;

/** Resposta no formato do serviço, com a tradução que o teste quiser. */
const respostaBoa = (texto: string) => ({ ok: true, status: 200, json: async () => ({ responseData: { translatedText: texto }, responseStatus: 200 }) }) as unknown as Response;

let chamadas: string[] = [];

beforeEach(() => {
  chamadas = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Finge o serviço: devolve o texto pedido entre colchetes, para o teste ver o que foi enviado. */
function fingirServico(resposta: (q: string) => Response | Promise<Response> = (q) => respostaBoa(`[${q}]`)) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const q = new URL(url).searchParams.get("q") ?? "";

      chamadas.push(q);

      return resposta(q);
    }),
  );
}

describe("partir o texto no tamanho que o serviço aceita", () => {
  it("texto curto vai inteiro, e texto vazio não vira pedido nenhum", () => {
    expect(partirTexto("Vaga para auxiliar administrativo.")).toEqual(["Vaga para auxiliar administrativo."]);
    expect(partirTexto("")).toEqual([]);
  });

  it("juntar os pedaços devolve exatamente o original: nada se perde nem se duplica", () => {
    const longo = "Primeira frase bem comprida sobre a vaga. ".repeat(40) + "\n\nSegundo parágrafo, com acentuação: ação, coração, não.";

    const pedacos = partirTexto(longo);

    expect(pedacos.length).toBeGreaterThan(1);
    expect(pedacos.join("")).toBe(longo);
  });

  it("nenhum pedaço estoura o limite, mesmo com acento (que ocupa dois bytes)", () => {
    const acentuado = "Não é só uma questão de inclusão, é de coração e de ação. ".repeat(30);

    for (const pedaco of partirTexto(acentuado)) expect(bytes(pedaco)).toBeLessThanOrEqual(LIMITE_DE_BYTES);
  });

  it("corta em quebra de linha ou fim de frase, não no meio de uma palavra", () => {
    const texto = `${"a".repeat(200)}. ${"b".repeat(200)}. ${"c".repeat(200)}.`;

    for (const pedaco of partirTexto(texto).slice(0, -1)) expect(pedaco.trimEnd()).toMatch(/[.!?…,;:]$|\n$/);
  });

  it("palavra única gigante é cortada mesmo assim, em vez de travar", () => {
    const pedacos = partirTexto("x".repeat(2000));

    expect(pedacos.join("")).toBe("x".repeat(2000));
    expect(pedacos.every((p) => bytes(p) <= LIMITE_DE_BYTES)).toBe(true);
  });
});

describe("o serviço devolve códigos HTML no lugar de aspas e acentos", () => {
  it("vira texto de gente", () => {
    expect(destrocarEntidades("Jo&#227;o disse &quot;ol&#225;&quot; &amp; saiu")).toBe('João disse "olá" & saiu');
  });
});

describe("traduzir", () => {
  it("manda o texto e devolve o que o serviço respondeu", async () => {
    fingirServico(() => respostaBoa("Administrative assistant position"));

    await expect(tradutorOnline.traduzir(["Vaga de auxiliar administrativo"], "pt", "en")).resolves.toEqual(["Administrative assistant position"]);
    expect(chamadas).toEqual(["Vaga de auxiliar administrativo"]);
  });

  it("texto longo vira vários pedidos, e as quebras de linha sobrevivem", async () => {
    fingirServico();

    const longo = `${"Frase sobre a vaga que se repete muito. ".repeat(20)}\n${"Outro parágrafo igualmente comprido aqui. ".repeat(20)}`;
    const [saida] = await tradutorOnline.traduzir([longo], "pt", "es");

    expect(chamadas.length).toBeGreaterThan(1);
    expect(saida).toContain("\n");
    // Cada pedido mandou só o miolo, sem os espaços das pontas: eles são recolocados na volta.
    expect(chamadas.every((q) => q === q.trim())).toBe(true);
  });

  it("espaço em branco não vira pedido: não gasta o limite gratuito à toa", async () => {
    fingirServico();

    await expect(tradutorOnline.traduzir(["   ", ""], "pt", "en")).resolves.toEqual(["   ", ""]);
    expect(chamadas).toHaveLength(0);
  });

  it("limite diário estourado é dito como limite, não como falha genérica", async () => {
    fingirServico(() => ({ ok: true, status: 200, json: async () => ({ responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" }, responseStatus: 403 }) }) as unknown as Response);

    await expect(tradutorOnline.traduzir(["qualquer coisa"], "pt", "en")).rejects.toMatchObject({ codigo: "limite_diario" });
  });

  it("muitos pedidos seguidos (429) também é limite", async () => {
    fingirServico(() => ({ ok: false, status: 429, json: async () => ({}) }) as unknown as Response);

    await expect(tradutorOnline.traduzir(["qualquer coisa"], "pt", "en")).rejects.toMatchObject({ codigo: "limite_diario" });
  });

  it("sem internet (ou bloqueador barrando) é dito como rede, para a pessoa saber o que conferir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));

    await expect(tradutorOnline.traduzir(["qualquer coisa"], "pt", "en")).rejects.toMatchObject({ codigo: "sem_rede" });
  });

  it("texto absurdamente longo avisa em vez de disparar dezenas de pedidos", async () => {
    fingirServico();

    await expect(tradutorOnline.traduzir(["palavra ".repeat(4000)], "pt", "en")).rejects.toBeInstanceOf(ErroDeTraducao);
    expect(chamadas.length).toBeLessThanOrEqual(MAXIMO_DE_PEDACOS);
  });
});
