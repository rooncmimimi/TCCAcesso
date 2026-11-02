import { describe, it, expect } from "vitest";

import {
    IDADE_MAXIMA_PLAUSIVEL,
    IDADE_MINIMA,
    cpfValido,
    nomeValido,
    normalizarNome,
    somenteDigitos,
    validarDataNascimento
} from "./validacoesPessoais.js";

/**
 * Vetores compartilhados com o Frontend (`lib/validacoesPessoais.test.ts`): as duas implementações
 * precisam concordar em todos eles.
 */

describe("cpfValido", () => {
    it.each(["529.982.247-25", "52998224725", "111.444.777-35", "123.456.789-09"])("aceita %s", (cpf) => {
        expect(cpfValido(cpf)).toBe(true);
    });

    it.each([
        ["dígito verificador errado", "123.456.789-00"],
        ["sequência de dígitos iguais", "111.111.111-11"],
        ["zeros", "000.000.000-00"],
        ["nove iguais", "999.999.999-99"],
        ["curto", "1234567890"],
        ["longo", "123456789012"],
        ["vazio", ""],
        ["letras", "abcdefghijk"]
    ])("recusa: %s", (_motivo, cpf) => {
        expect(cpfValido(cpf)).toBe(false);
    });

    it("ignora a pontuação e confere só os dígitos", () => {
        expect(cpfValido(" 529 982 247 / 25 ")).toBe(true);
        expect(somenteDigitos("529.982.247-25")).toBe("52998224725");
    });
});

describe("nomeValido e normalizarNome", () => {
    it.each([
        "Maria da Silva",
        "João D'Ávila",
        "João D’Ávila",
        "Anne-Marie O'Neil",
        "José dos Santos Jr.",
        "Zoë Müller",
        "Ñandú Pérez",
        "Åsa Öberg",
        "Maria das Dores",
        "Ana",
        "李小龙"
    ])("aceita %s", (nome) => {
        expect(nomeValido(nome)).toBe(true);
    });

    it.each([
        ["número", "Ana1 Souza"],
        ["símbolo", "Ana@Souza"],
        ["emoji", "João 😀"],
        ["tag", "<script>"],
        ["curto demais", "Ab"],
        ["começa por hífen", "-Ana Souza"],
        ["começa por apóstrofo", "'Ana"],
        ["hífen duplicado", "Ana--Paula"],
        ["apóstrofo solto", "Ana ' Paula"],
        ["vazio", "   "],
        ["longo demais", "a".repeat(151)]
    ])("recusa: %s", (_motivo, nome) => {
        expect(nomeValido(nome)).toBe(false);
    });

    it("corrige espaços duplicados, nas pontas e não separáveis, sem mexer na grafia", () => {
        expect(normalizarNome("  Ana   Paula  de   Souza  ")).toBe("Ana Paula de Souza");
        expect(normalizarNome("João")).toBe("João");
        expect(nomeValido("  Ana   Paula  ")).toBe(true);
    });
});

describe("validarDataNascimento", () => {
    // 31/10/2026, no fuso local (a função compara o dia do calendário).
    const hoje = new Date(2026, 9, 31);
    const motivo = (valor) => validarDataNascimento(valor, hoje).motivo;

    it.each(["1990-05-20", "1976-02-29", "1950-01-01", "2010-10-31"])("aceita %s", (data) => {
        expect(validarDataNascimento(data, hoje)).toEqual({ valida: true });
    });

    it.each([
        ["1990/05/20", "formato"],
        ["20/05/1990", "formato"],
        ["1990-5-2", "formato"],
        ["", "formato"],
        ["ontem", "formato"],
        ["2026-02-30", "inexistente"],
        ["2025-13-01", "inexistente"],
        ["2023-02-29", "inexistente"],
        ["2000-00-10", "inexistente"],
        ["2026-11-01", "futura"],
        ["2030-01-01", "futura"],
        ["2010-11-01", "menor"],
        ["2020-01-01", "menor"],
        ["0001-01-01", "implausivel"],
        ["1900-01-01", "implausivel"],
        ["1905-10-31", "implausivel"]
    ])("recusa %j (%s)", (data, esperado) => {
        expect(motivo(data)).toBe(esperado);
    });

    it("a idade mínima vale no dia do aniversário e a máxima plausível também", () => {
        expect(IDADE_MINIMA).toBe(16);
        expect(IDADE_MAXIMA_PLAUSIVEL).toBe(120);
        expect(validarDataNascimento("2010-10-31", hoje).valida).toBe(true);
        expect(motivo("2010-11-01")).toBe("menor");
        expect(validarDataNascimento("1906-10-31", hoje).valida).toBe(true);
        expect(motivo("1905-10-31")).toBe("implausivel");
    });

    it("não cria barreira para profissionais 50+ nem para idades avançadas plausíveis", () => {
        for (const ano of [1976, 1966, 1956, 1946, 1936]) {
            expect(validarDataNascimento(`${ano}-06-15`, hoje).valida).toBe(true);
        }
    });
});
