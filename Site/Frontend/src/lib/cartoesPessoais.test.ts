import { beforeEach, describe, expect, it, vi } from "vitest";

import { CARTOES_PADRAO, GRUPOS_DE_CARTOES } from "@/dados/cartoesDeComunicacao";
import { CHAVE_DOS_CARTOES, MAXIMO_DE_CARTOES, TAMANHO_MAXIMO_DO_CARTAO, adicionarCartaoPessoal, lerCartoesPessoais, removerCartaoPessoal } from "@/lib/cartoesPessoais";

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("cartões padrão", () => {
  it("trazem as frases pedidas e têm ids únicos e grupos conhecidos", () => {
    const textos = CARTOES_PADRAO.map((c) => c.texto);

    for (const esperado of ["Preciso de um momento para responder.", "Poderia repetir a pergunta?", "Prefiro responder por escrito.", "Não compreendi a instrução.", "Preciso de ajuda.", "Gostaria de solicitar uma adaptação.", "Preciso de uma pausa."]) {
      expect(textos).toContain(esperado);
    }

    expect(new Set(CARTOES_PADRAO.map((c) => c.id)).size).toBe(CARTOES_PADRAO.length);

    const grupos = GRUPOS_DE_CARTOES.map((g) => g.id);

    expect(CARTOES_PADRAO.every((c) => grupos.includes(c.grupo))).toBe(true);
    expect(grupos.every((g) => CARTOES_PADRAO.some((c) => c.grupo === g))).toBe(true);
  });
});

describe("cartões pessoais", () => {
  it("começa vazio e guarda o que a pessoa cria, com espaços arrumados", () => {
    expect(lerCartoesPessoais()).toEqual([]);

    const r = adicionarCartaoPessoal("  Prefiro   conversar por   texto. ");

    expect(r.ok).toBe(true);
    expect(lerCartoesPessoais().map((c) => c.texto)).toEqual(["Prefiro conversar por texto."]);
  });

  it("recusa vazio, repetido (sem diferenciar maiúsculas) e grande demais", () => {
    expect(adicionarCartaoPessoal("   ")).toMatchObject({ ok: false });
    expect(adicionarCartaoPessoal("a".repeat(TAMANHO_MAXIMO_DO_CARTAO + 1))).toMatchObject({ ok: false });

    adicionarCartaoPessoal("Oi");

    expect(adicionarCartaoPessoal("OI")).toMatchObject({ ok: false, motivo: expect.stringMatching(/já tem/) });
  });

  it("respeita o limite de cartões", () => {
    for (let i = 0; i < MAXIMO_DE_CARTOES; i++) expect(adicionarCartaoPessoal(`Frase ${i}`).ok).toBe(true);

    expect(adicionarCartaoPessoal("Mais uma")).toMatchObject({ ok: false });
    expect(lerCartoesPessoais()).toHaveLength(MAXIMO_DE_CARTOES);
  });

  it("remove pelo id", () => {
    const r = adicionarCartaoPessoal("A");
    const id = r.ok ? r.lista[0].id : "";

    adicionarCartaoPessoal("B");
    expect(removerCartaoPessoal(id).map((c) => c.texto)).toEqual(["B"]);
    expect(lerCartoesPessoais().map((c) => c.texto)).toEqual(["B"]);
  });

  it("ignora conteúdo corrompido ou de outro formato", () => {
    window.localStorage.setItem(CHAVE_DOS_CARTOES, "{nao e json");
    expect(lerCartoesPessoais()).toEqual([]);

    window.localStorage.setItem(CHAVE_DOS_CARTOES, JSON.stringify({ a: 1 }));
    expect(lerCartoesPessoais()).toEqual([]);

    window.localStorage.setItem(CHAVE_DOS_CARTOES, JSON.stringify([{ id: "x", texto: "ok" }, { id: 2, texto: "ruim" }, null, { id: "y", texto: "   " }]));
    expect(lerCartoesPessoais()).toEqual([{ id: "x", texto: "ok" }]);
  });

  it("armazenamento bloqueado: avisa em vez de fingir que guardou", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    expect(adicionarCartaoPessoal("Frase")).toMatchObject({ ok: false, motivo: expect.stringMatching(/bloqueado/) });
  });
});
