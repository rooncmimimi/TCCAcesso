import { describe, it, expect } from "vitest";

import { RegistroDeUsoUnico, codigosDeEntregaUsados } from "./usoUnico.js";

const EM_SEGUNDOS = (ms) => Math.floor(ms / 1000);

describe("RegistroDeUsoUnico", () => {
    it("reserva um identificador novo", () => {
        const registro = new RegistroDeUsoUnico();
        expect(registro.reservar("a", EM_SEGUNDOS(Date.now() + 60_000))).toBe(true);
    });

    it("recusa o mesmo identificador uma segunda vez", () => {
        const registro = new RegistroDeUsoUnico();
        const exp = EM_SEGUNDOS(Date.now() + 60_000);
        registro.reservar("a", exp);
        expect(registro.reservar("a", exp)).toBe(false);
    });

    it("identificadores diferentes não se atrapalham", () => {
        const registro = new RegistroDeUsoUnico();
        const exp = EM_SEGUNDOS(Date.now() + 60_000);
        expect(registro.reservar("a", exp)).toBe(true);
        expect(registro.reservar("b", exp)).toBe(true);
    });

    it("duas reservas 'simultâneas' do mesmo identificador: só uma vence", async () => {
        const registro = new RegistroDeUsoUnico();
        const exp = EM_SEGUNDOS(Date.now() + 60_000);
        const resultados = await Promise.all([1, 2, 3].map(async () => registro.reservar("a", exp)));
        expect(resultados.filter(Boolean)).toHaveLength(1);
    });

    it("liberar devolve o identificador para uso", () => {
        const registro = new RegistroDeUsoUnico();
        const exp = EM_SEGUNDOS(Date.now() + 60_000);
        registro.reservar("a", exp);
        registro.liberar("a");
        expect(registro.reservar("a", exp)).toBe(true);
    });

    it("esquece o que já expirou, para a memória não crescer sem limite", () => {
        const registro = new RegistroDeUsoUnico();
        const agora = Date.now();
        registro.reservar("velho", EM_SEGUNDOS(agora + 1_000), agora);
        registro.reservar("outro-velho", EM_SEGUNDOS(agora + 2_000), agora);
        expect(registro.tamanho).toBe(2);

        registro.reservar("novo", EM_SEGUNDOS(agora + 500_000), agora + 10_000);

        expect(registro.tamanho).toBe(1);
    });

    it("um identificador que já expirou pode voltar a ser reservado (o código dele não vale mais de qualquer forma)", () => {
        const registro = new RegistroDeUsoUnico();
        const agora = Date.now();
        registro.reservar("a", EM_SEGUNDOS(agora + 1_000), agora);
        expect(registro.reservar("a", EM_SEGUNDOS(agora + 100_000), agora + 5_000)).toBe(true);
    });
});

describe("codigosDeEntregaUsados", () => {
  it("é um registro compartilhado pelo processo", () => {
    expect(codigosDeEntregaUsados).toBeInstanceOf(RegistroDeUsoUnico);
  });
});
