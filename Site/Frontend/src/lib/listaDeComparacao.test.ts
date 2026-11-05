import { beforeEach, describe, expect, it } from "vitest";

import { LIMITE_DE_VAGAS } from "@/lib/comparadorDeVagas";
import { CHAVE_DA_COMPARACAO, adicionarNaComparacao, limparComparacao, lerComparacao, removerDaComparacao } from "@/lib/listaDeComparacao";

beforeEach(() => sessionStorage.clear());

describe("lista de comparação", () => {
  it("começa vazia", () => {
    expect(lerComparacao()).toEqual([]);
  });

  it("adiciona, não repete e remove", () => {
    expect(adicionarNaComparacao("a")).toBe("adicionada");
    expect(adicionarNaComparacao("a")).toBe("ja-estava");
    expect(adicionarNaComparacao("b")).toBe("adicionada");
    expect(lerComparacao()).toEqual(["a", "b"]);

    removerDaComparacao("a");
    expect(lerComparacao()).toEqual(["b"]);

    limparComparacao();
    expect(lerComparacao()).toEqual([]);
  });

  it(`aceita no máximo ${LIMITE_DE_VAGAS} vagas`, () => {
    for (let i = 0; i < LIMITE_DE_VAGAS; i++) expect(adicionarNaComparacao(`v${i}`)).toBe("adicionada");

    expect(adicionarNaComparacao("extra")).toBe("lista-cheia");
    expect(lerComparacao()).toHaveLength(LIMITE_DE_VAGAS);
  });

  it("ignora conteúdo inválido guardado", () => {
    sessionStorage.setItem(CHAVE_DA_COMPARACAO, "{isso nao e json");
    expect(lerComparacao()).toEqual([]);

    sessionStorage.setItem(CHAVE_DA_COMPARACAO, JSON.stringify({ a: 1 }));
    expect(lerComparacao()).toEqual([]);

    sessionStorage.setItem(CHAVE_DA_COMPARACAO, JSON.stringify(["a", 3, "", "a", "b"]));
    expect(lerComparacao()).toEqual(["a", "b"]);
  });
});
