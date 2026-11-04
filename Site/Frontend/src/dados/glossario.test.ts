import { describe, expect, it } from "vitest";

import { GLOSSARIO, termosNoTexto } from "./glossario";

describe("GLOSSARIO", () => {
  it("cobre os termos pedidos para o Bloco 1", () => {
    const termos = GLOSSARIO.map((t) => t.termo);

    for (const esperado of [
      "CLT",
      "PJ",
      "Híbrido",
      "Presencial",
      "Remoto",
      "PCD",
      "Cotas",
      "Adaptação razoável",
      "Benefícios",
      "Jornada",
      "Banco de horas",
      "Período de experiência",
      "Requisitos obrigatórios",
      "Requisitos desejáveis",
      "Proatividade",
      "Autonomia",
    ]) {
      expect(termos, esperado).toContain(esperado);
    }
  });

  it("cada termo tem id único, variantes e uma explicação de verdade", () => {
    const ids = GLOSSARIO.map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const t of GLOSSARIO) {
      expect(t.variantes.length, t.id).toBeGreaterThan(0);
      expect(t.explicacao.length, t.id).toBeGreaterThan(30);
      expect(t.explicacao.trim().endsWith("."), t.id).toBe(true);
    }
  });

  it("não promete direitos que dependem do contrato como se fossem certos", () => {
    const pj = GLOSSARIO.find((t) => t.id === "pj")!;
    const clt = GLOSSARIO.find((t) => t.id === "clt")!;

    expect(pj.explicacao).toMatch(/não vêm automaticamente|o que vale é o combinado/);
    expect(clt.explicacao).toContain("13º");
  });
});

describe("termosNoTexto", () => {
  const ids = (texto: string) => termosNoTexto(texto).map((t) => t.id);

  it("acha termos ignorando acento e maiúsculas", () => {
    expect(ids("Vaga HÍBRIDA, contrato CLT, com BENEFICIOS.")).toEqual(["clt", "hibrido", "beneficios"]);
  });

  it("acha expressões com mais de uma palavra", () => {
    expect(ids("Oferecemos banco de horas e período de experiência de 45 dias.")).toEqual(["banco-de-horas", "periodo-de-experiencia"]);
  });

  it("só casa palavra inteira: sigla dentro de outra palavra não conta", () => {
    expect(ids("Montagem de objetos e escotilhas")).toEqual([]);
    expect(ids("Vaga PJ")).toEqual(["pj"]);
  });

  it("não repete um termo que aparece várias vezes", () => {
    expect(ids("CLT, CLT e mais CLT")).toEqual(["clt"]);
  });

  it("texto vazio ou sem termos devolve lista vazia", () => {
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
    expect(ids("Atender clientes na loja")).toEqual([]);
  });

  it("entende a forma por extenso usada nas vagas", () => {
    expect(ids("Vaga para pessoa com deficiência, com carteira assinada")).toEqual(["clt", "pcd"]);
  });

  it("não quebra com caracteres especiais de regex no texto", () => {
    expect(() => termosNoTexto("a.*+?^${}()|[]\\ CLT")).not.toThrow();
    expect(ids("a.*+?^${}()|[]\\ CLT")).toEqual(["clt"]);
  });
});
