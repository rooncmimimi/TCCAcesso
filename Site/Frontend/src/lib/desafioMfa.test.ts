import { describe, it, expect, beforeEach, vi } from "vitest";

import { VALIDADE_DO_DESAFIO_MS, guardarDesafio, lerDesafio, limparDesafio } from "./desafioMfa";

const AGORA = 1_800_000_000_000;

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("desafio do segundo fator", () => {
  it("guarda e lê o desafio na aba", () => {
    guardarDesafio("desafio-abc", AGORA);

    expect(lerDesafio(AGORA + 1000)).toEqual({ desafio: "desafio-abc", em: AGORA });
  });

  it("fica no sessionStorage (some ao fechar a aba) e nunca no localStorage", () => {
    guardarDesafio("desafio-abc", AGORA);

    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);
  });

  it("sem nada guardado, devolve null", () => {
    expect(lerDesafio()).toBeNull();
  });

  it("vencido (passou do prazo): devolve null e já o apaga", () => {
    guardarDesafio("desafio-abc", AGORA);

    expect(lerDesafio(AGORA + VALIDADE_DO_DESAFIO_MS + 1)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("o prazo daqui é menor que os 5 minutos do servidor, para não oferecer um desafio que vai falhar", () => {
    expect(VALIDADE_DO_DESAFIO_MS).toBeLessThan(5 * 60 * 1000);
  });

  it.each([["isso não é JSON"], ['{"desafio": 5, "em": "x"}'], ["null"], ["[]"]])("valor corrompido (%s) vira null e é apagado", (bruto) => {
    window.sessionStorage.setItem("acesso:mfa-desafio", bruto);

    expect(lerDesafio(AGORA)).toBeNull();
    expect(window.sessionStorage.getItem("acesso:mfa-desafio")).toBeNull();
  });

  it("limpar apaga", () => {
    guardarDesafio("desafio-abc", AGORA);

    limparDesafio();

    expect(lerDesafio(AGORA)).toBeNull();
  });

  it("armazenamento bloqueado não derruba nada", () => {
    const bloqueado = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    expect(() => guardarDesafio("x")).not.toThrow();

    bloqueado.mockRestore();
  });
});
