import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHAVE_HISTORICO,
  contemInstrucao,
  LIMITE_DE_ITENS,
  LIMITE_DO_TEXTO,
  lerHistorico,
  limparHistorico,
  removerInstrucao,
  salvarInstrucao,
} from "./historicoInstrucoes";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("historicoInstrucoes", () => {
  it("guarda e lê uma instrução, com a data", () => {
    expect(salvarInstrucao({ titulo: "Vaga: Auxiliar", texto: "Resumo da vaga." })).toBe(true);

    const [item] = lerHistorico();
    expect(item).toMatchObject({ titulo: "Vaga: Auxiliar", texto: "Resumo da vaga." });
    expect(Number.isNaN(Date.parse(item.salvaEm))).toBe(false);
    expect(item.id).toBeTruthy();
  });

  it("o mais recente fica no topo", () => {
    salvarInstrucao({ titulo: "A", texto: "um" });
    salvarInstrucao({ titulo: "B", texto: "dois" });

    expect(lerHistorico().map((i) => i.titulo)).toEqual(["B", "A"]);
  });

  it("salvar a mesma coisa de novo não duplica, só sobe para o topo", () => {
    salvarInstrucao({ titulo: "A", texto: "um" });
    salvarInstrucao({ titulo: "B", texto: "dois" });
    salvarInstrucao({ titulo: "A", texto: "um" });

    expect(lerHistorico().map((i) => i.titulo)).toEqual(["A", "B"]);
  });

  it("normaliza espaços e rejeita título ou texto vazio", () => {
    salvarInstrucao({ titulo: "  Com   espaços ", texto: "texto\n\ncom   quebras" });

    expect(lerHistorico()[0]).toMatchObject({ titulo: "Com espaços", texto: "texto com quebras" });
    expect(salvarInstrucao({ titulo: "", texto: "x" })).toBe(false);
    expect(salvarInstrucao({ titulo: "x", texto: "   " })).toBe(false);
  });

  it("corta texto enorme e respeita o limite de itens, descartando os mais antigos", () => {
    salvarInstrucao({ titulo: "Longo", texto: "a".repeat(LIMITE_DO_TEXTO * 2) });
    expect(lerHistorico()[0].texto.length).toBeLessThanOrEqual(LIMITE_DO_TEXTO);

    for (let i = 0; i < LIMITE_DE_ITENS + 5; i++) salvarInstrucao({ titulo: `Item ${i}`, texto: `texto ${i}` });
    const itens = lerHistorico();
    expect(itens).toHaveLength(LIMITE_DE_ITENS);
    expect(itens[0].titulo).toBe(`Item ${LIMITE_DE_ITENS + 4}`);
    expect(itens.some((i) => i.titulo === "Longo")).toBe(false);
  });

  it("remove um item e limpa tudo", () => {
    salvarInstrucao({ titulo: "A", texto: "um" });
    salvarInstrucao({ titulo: "B", texto: "dois" });
    const [b] = lerHistorico();

    expect(removerInstrucao(b.id)).toBe(true);
    expect(lerHistorico().map((i) => i.titulo)).toEqual(["A"]);

    expect(limparHistorico()).toBe(true);
    expect(lerHistorico()).toEqual([]);
    expect(window.localStorage.getItem(CHAVE_HISTORICO)).toBeNull();
  });

  it("avisa a própria aba quando muda (o evento storage só chega às outras)", () => {
    const ouvinte = vi.fn();
    window.addEventListener("acesso:historico-instrucoes:mudou", ouvinte);

    salvarInstrucao({ titulo: "A", texto: "um" });
    expect(ouvinte).toHaveBeenCalledTimes(1);

    limparHistorico();
    expect(ouvinte).toHaveBeenCalledTimes(2);
    window.removeEventListener("acesso:historico-instrucoes:mudou", ouvinte);
  });

  it.each([
    ["JSON quebrado", "{nao é json"],
    ["objeto em vez de lista", '{"a":1}'],
    ["texto solto", '"oi"'],
  ])("conteúdo corrompido (%s) vira lista vazia, sem erro", (_nome, bruto) => {
    window.localStorage.setItem(CHAVE_HISTORICO, bruto);

    expect(lerHistorico()).toEqual([]);
  });

  it("ignora entradas de formato errado no meio de entradas boas", () => {
    window.localStorage.setItem(
      CHAVE_HISTORICO,
      JSON.stringify([{ id: "1", titulo: "ok", texto: "ok", salvaEm: "2026-01-01" }, { id: 2 }, null, "x"]),
    );

    expect(lerHistorico().map((i) => i.id)).toEqual(["1"]);
  });

  it("sem localStorage disponível (modo restrito), devolve falso em vez de quebrar", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("cheio", "QuotaExceededError");
    });

    expect(salvarInstrucao({ titulo: "A", texto: "um" })).toBe(false);
    expect(lerHistorico()).toEqual([]);
  });

  it("contemInstrucao compara do mesmo jeito que a gravação normaliza", () => {
    salvarInstrucao({ titulo: "A  B", texto: "um\ndois" });

    expect(contemInstrucao(lerHistorico(), { titulo: "A B", texto: "um dois" })).toBe(true);
    expect(contemInstrucao(lerHistorico(), { titulo: "A B", texto: "outro" })).toBe(false);
  });
});
