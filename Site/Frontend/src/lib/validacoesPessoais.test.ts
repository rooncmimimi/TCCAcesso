import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  cpfValido,
  nomeValido,
  normalizarNome,
  somenteDigitos,
  validarDataNascimento,
} from "./validacoesPessoais";

/** Mesmos vetores de `Backend/src/utils/validacoesPessoais.test.js`: as duas implementações têm de concordar. */

const CPFS_VALIDOS = ["529.982.247-25", "52998224725", "111.444.777-35", "123.456.789-09"];
const CPFS_INVALIDOS = ["123.456.789-00", "111.111.111-11", "000.000.000-00", "999.999.999-99", "1234567890", "123456789012", "", "abcdefghijk"];

const NOMES_VALIDOS = [
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
  "李小龙",
  "  Ana   Paula  ",
];
const NOMES_INVALIDOS = ["Ana1 Souza", "Ana@Souza", "João 😀", "<script>", "Ab", "-Ana Souza", "'Ana", "Ana--Paula", "Ana ' Paula", "   ", "a".repeat(151)];

const HOJE = new Date(2026, 9, 31);
const DATAS: [string, string | null][] = [
  ["1990-05-20", null],
  ["1976-02-29", null],
  ["1950-01-01", null],
  ["2010-10-31", null],
  ["1906-10-31", null],
  ["1990/05/20", "formato"],
  ["20/05/1990", "formato"],
  ["1990-5-2", "formato"],
  ["", "formato"],
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
  ["1905-10-31", "implausivel"],
];

describe("cpfValido", () => {
  it.each(CPFS_VALIDOS)("aceita %s", (cpf) => expect(cpfValido(cpf)).toBe(true));
  it.each(CPFS_INVALIDOS)("recusa %j", (cpf) => expect(cpfValido(cpf)).toBe(false));

  it("ignora a pontuação e confere só os dígitos", () => {
    expect(cpfValido(" 529 982 247 / 25 ")).toBe(true);
    expect(somenteDigitos("529.982.247-25")).toBe("52998224725");
  });
});

describe("nomeValido e normalizarNome", () => {
  it.each(NOMES_VALIDOS)("aceita %j", (nome) => expect(nomeValido(nome)).toBe(true));
  it.each(NOMES_INVALIDOS)("recusa %j", (nome) => expect(nomeValido(nome)).toBe(false));

  it("corrige espaços duplicados, nas pontas e não separáveis, sem mexer na grafia", () => {
    expect(normalizarNome("  Ana   Paula  de   Souza  ")).toBe("Ana Paula de Souza");
    expect(normalizarNome("João")).toBe("João");
  });
});

describe("validarDataNascimento", () => {
  it.each(DATAS)("%j → %s", (data, motivo) => {
    const resultado = validarDataNascimento(data, HOJE);

    expect(resultado.valida).toBe(motivo === null);
    if (!resultado.valida) expect(resultado.motivo).toBe(motivo);
  });

  it("não cria barreira para profissionais 50+", () => {
    for (const ano of [1976, 1966, 1956, 1946, 1936]) {
      expect(validarDataNascimento(`${ano}-06-15`, HOJE).valida).toBe(true);
    }
  });
});

describe("paridade com o Backend", () => {
  it("as duas implementações dão o mesmo resultado em todos os vetores", async () => {
    // O servidor é quem vale: se o algoritmo de um lado mudar e o do outro não, este teste quebra.
    // O módulo do servidor não tem imports: lê o texto, tira o `export` e avalia isolado.
    const caminho = resolve(__dirname, "../../../Backend/src/utils/validacoesPessoais.js");
    const fonte = readFileSync(caminho, "utf8").replace(/^export /gm, "");
    const servidor = new Function(
      `${fonte}; return { cpfValido, nomeValido, normalizarNome, validarDataNascimento };`,
    )() as typeof import("./validacoesPessoais");

    for (const cpf of [...CPFS_VALIDOS, ...CPFS_INVALIDOS]) {
      expect(cpfValido(cpf), `cpf ${cpf}`).toBe(servidor.cpfValido(cpf));
    }

    for (const nome of [...NOMES_VALIDOS, ...NOMES_INVALIDOS]) {
      expect(nomeValido(nome), `nome ${nome}`).toBe(servidor.nomeValido(nome));
      expect(normalizarNome(nome), `normalizar ${nome}`).toBe(servidor.normalizarNome(nome));
    }

    for (const [data] of DATAS) {
      expect(validarDataNascimento(data, HOJE), `data ${data}`).toEqual(servidor.validarDataNascimento(data, HOJE));
    }
  });
});
