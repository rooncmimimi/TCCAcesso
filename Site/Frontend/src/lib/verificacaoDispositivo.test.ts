import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  VALIDADE_DO_DESAFIO_MS,
  guardarVerificacao,
  lerVerificacao,
  limparVerificacao,
  renovarVerificacao,
  segundosParaReenviar,
} from "./verificacaoDispositivo";

const DADOS = { desafio: "d1", emailMascarado: "an***@exemplo.com", reenvioEmSegundos: 60 };

beforeEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("guardar e ler", () => {
  it("guarda no sessionStorage (some ao fechar a aba) e devolve o que guardou", () => {
    guardarVerificacao(DADOS, 1000);

    expect(lerVerificacao(2000)).toEqual({ ...DADOS, enviadoEm: 1000, em: 1000 });
    expect(window.localStorage.length).toBe(0);
  });

  it("sem nada guardado: null", () => {
    expect(lerVerificacao()).toBeNull();
  });

  it("vencido (mais de 19 minutos): null e já apagado", () => {
    guardarVerificacao(DADOS, 0);

    expect(lerVerificacao(VALIDADE_DO_DESAFIO_MS + 1)).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("dentro do prazo ainda vale", () => {
    guardarVerificacao(DADOS, 0);

    expect(lerVerificacao(VALIDADE_DO_DESAFIO_MS - 1)).not.toBeNull();
  });

  it.each([["lixo"], ["{}"], ['{"desafio":1}'], ['{"desafio":"x","emailMascarado":"a","reenvioEmSegundos":60,"enviadoEm":"ontem","em":1}']])(
    "conteúdo corrompido (%s): null e apagado",
    (bruto) => {
      window.sessionStorage.setItem("acesso:verificacao-dispositivo", bruto);

      expect(lerVerificacao()).toBeNull();
      expect(window.sessionStorage.length).toBe(0);
    },
  );

  it("armazenamento bloqueado: nada lança", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    expect(() => guardarVerificacao(DADOS)).not.toThrow();
    expect(lerVerificacao()).toBeNull();
    expect(() => limparVerificacao()).not.toThrow();
  });
});

describe("renovar (depois de pedir outro código)", () => {
  it("troca o desafio, recomeça o relógio da espera e preserva o e-mail mascarado", () => {
    guardarVerificacao(DADOS, 1000);

    renovarVerificacao({ desafio: "d2", reenvioEmSegundos: 45 }, 5000);

    expect(lerVerificacao(6000)).toEqual({ desafio: "d2", emailMascarado: "an***@exemplo.com", reenvioEmSegundos: 45, enviadoEm: 5000, em: 5000 });
  });

  it("sem desafio guardado, não inventa um", () => {
    renovarVerificacao({ desafio: "d2", reenvioEmSegundos: 45 });

    expect(lerVerificacao()).toBeNull();
  });
});

describe("segundosParaReenviar", () => {
  it("conta a partir do último envio e nunca fica negativo", () => {
    const v = { enviadoEm: 10_000, reenvioEmSegundos: 60 };

    expect(segundosParaReenviar(v, 10_000)).toBe(60);
    expect(segundosParaReenviar(v, 40_500)).toBe(30);
    expect(segundosParaReenviar(v, 70_000)).toBe(0);
    expect(segundosParaReenviar(v, 500_000)).toBe(0);
  });
});
