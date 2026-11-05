import { describe, expect, it } from "vitest";

import { PROFISSOES, buscarProfissoes } from "@/dados/profissoes";

describe("dicionário de profissões", () => {
  it("toda profissão tem todos os campos preenchidos", () => {
    for (const p of PROFISSOES) {
      expect(p.nome.length, p.id).toBeGreaterThan(3);
      expect(p.resumo.length, p.id).toBeGreaterThan(30);
      expect(p.descricaoDaImagem.length, p.id).toBeGreaterThan(10);

      for (const lista of [p.atividades, p.ferramentas, p.habilidades, p.rotina]) {
        expect(lista.length, p.id).toBeGreaterThanOrEqual(3);
        expect(lista.every((i) => i.trim().length > 3), p.id).toBe(true);
      }
    }
  });

  it("os ids são únicos", () => {
    expect(new Set(PROFISSOES.map((p) => p.id)).size).toBe(PROFISSOES.length);
  });

  it("não promete salário, horário nem vaga", () => {
    const texto = JSON.stringify(PROFISSOES).toLowerCase();

    expect(texto).not.toMatch(/r\$|salário de|ganha|garantid/);
  });

  it("a busca ignora acento e maiúsculas e olha nome, atividades, ferramentas e habilidades", () => {
    expect(buscarProfissoes("ADMINISTRATIVO").map((p) => p.id)).toContain("auxiliar-administrativo");
    expect(buscarProfissoes("enfermagem").map((p) => p.id)).toEqual(["tecnico-de-enfermagem"]);
    expect(buscarProfissoes("código de barras").map((p) => p.id)).toEqual(expect.arrayContaining(["operador-de-caixa", "estoquista"]));
  });

  it("busca vazia devolve tudo; busca sem resultado, nada", () => {
    expect(buscarProfissoes("  ")).toHaveLength(PROFISSOES.length);
    expect(buscarProfissoes("astronauta")).toEqual([]);
  });
});
