import { describe, expect, it } from "vitest";

import { COMPETENCIAS, competenciasNoTexto } from "./competencias";

describe("COMPETENCIAS", () => {
  it("cobre as expressões pedidas", () => {
    const termos = COMPETENCIAS.map((c) => c.termo.toLowerCase()).join(" | ");

    for (const esperado of ["boa comunicação", "flexibilidade", "proatividade", "trabalho em equipe", "organização", "autonomia"]) {
      expect(termos).toContain(esperado);
    }
  });

  it("tem ids únicos e todos os campos preenchidos", () => {
    expect(new Set(COMPETENCIAS.map((c) => c.id)).size).toBe(COMPETENCIAS.length);

    for (const c of COMPETENCIAS) {
      expect(c.significa.length, c.id).toBeGreaterThan(20);
      expect(c.necessariaQuando.length, c.id).toBeGreaterThan(20);
      expect(c.preferenciaQuando.length, c.id).toBeGreaterThan(20);
      expect(c.perguntar.length, c.id).toBeGreaterThan(20);
    }
  });

  it("toda competência mostra pelo menos duas formas de demonstrar, e nenhuma depende só de fala ou de presença", () => {
    for (const c of COMPETENCIAS) {
      expect(c.outrasFormas.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.outrasFormas.join(" ").toLowerCase(), c.id).toMatch(/escrit|mensagem|lista|planilha|agenda|libras|ferramenta|imagem|registr|tutorial|calend/);
    }
  });

  it("não presume que a competência só se prova falando nem presencialmente", () => {
    const todo = COMPETENCIAS.flatMap((c) => [c.significa, ...c.outrasFormas]).join(" ").toLowerCase();

    expect(todo).not.toMatch(/apenas (?:falando|presencial)|somente (?:falando|presencial)|só (?:falando|presencial)/);
  });

  it("separa o que é necessário do que pode ser só preferência genérica", () => {
    for (const c of COMPETENCIAS) {
      expect(c.necessariaQuando).not.toBe(c.preferenciaQuando);
    }
  });
});

describe("competenciasNoTexto", () => {
  it("acha termos sem diferenciar acento e maiúsculas, sem repetir", () => {
    const achadas = competenciasNoTexto("Buscamos PROATIVIDADE e boa comunicacao. Ter proatividade é essencial.");

    expect(achadas.map((c) => c.id)).toEqual(["comunicacao", "proatividade"]);
  });

  it("só em palavra inteira", () => {
    expect(competenciasNoTexto("Gostamos de pessoas autonomas.")).toEqual([]);
    expect(competenciasNoTexto("Valorizamos a autonomia.").map((c) => c.id)).toEqual(["autonomia"]);
  });

  it("texto vazio ou sem nenhuma expressão não devolve nada", () => {
    expect(competenciasNoTexto("")).toEqual([]);
    expect(competenciasNoTexto(null)).toEqual([]);
    expect(competenciasNoTexto("Atender clientes e organizar arquivos do setor.")).toEqual([]);
  });

  it("acha 'organizado' e 'trabalhar sob pressão'", () => {
    expect(competenciasNoTexto("Pessoa organizada, capaz de trabalhar sob pressão.").map((c) => c.id)).toEqual(["organizacao", "pressao"]);
  });
});
