import { describe, expect, it } from "vitest";

import { horaDoVencimento, minutosQueFaltam, situacaoDoPrazo, venceEm } from "./prazoDoCodigo";

const MIN = 60_000;
const ENVIO = Date.UTC(2026, 10, 4, 12, 0, 0);

describe("prazoDoCodigo", () => {
  it("o código vence 15 minutos depois do envio", () => {
    expect(venceEm(ENVIO)).toBe(ENVIO + 15 * MIN);
  });

  it("fica em folga até faltarem 3 minutos, depois avisa, e vence no minuto 15", () => {
    expect(situacaoDoPrazo(ENVIO, ENVIO)).toBe("folga");
    expect(situacaoDoPrazo(ENVIO, ENVIO + 11 * MIN)).toBe("folga");
    expect(situacaoDoPrazo(ENVIO, ENVIO + 12 * MIN)).toBe("acabando");
    expect(situacaoDoPrazo(ENVIO, ENVIO + 14 * MIN + 59_000)).toBe("acabando");
    expect(situacaoDoPrazo(ENVIO, ENVIO + 15 * MIN)).toBe("venceu");
    expect(situacaoDoPrazo(ENVIO, ENVIO + 40 * MIN)).toBe("venceu");
  });

  it("arredonda os minutos que faltam para cima e nunca fica negativo", () => {
    expect(minutosQueFaltam(ENVIO, ENVIO + 12 * MIN)).toBe(3);
    expect(minutosQueFaltam(ENVIO, ENVIO + 12 * MIN + 1)).toBe(3);
    expect(minutosQueFaltam(ENVIO, ENVIO + 14 * MIN + 30_000)).toBe(1);
    expect(minutosQueFaltam(ENVIO, ENVIO + 99 * MIN)).toBe(0);
  });

  it("mostra a hora do vencimento com horas e minutos", () => {
    expect(horaDoVencimento(ENVIO, "pt-BR")).toMatch(/^\d{2}:\d{2}$/);
  });
});
