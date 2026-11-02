import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { AVISO_DE_PRIVACIDADE, DOCUMENTOS, TERMOS_DE_USO, VERSAO_DOCUMENTOS } from "./documentosLegais";

/**
 * O aceite precisa apontar para o texto que a pessoa de fato viu: a versão que o Site manda é a que
 * o servidor aceita, e os documentos se leem sem referência quebrada.
 */

const config = readFileSync(resolve(__dirname, "../../../Backend/src/config/documentosLegais.js"), "utf8");

describe("versão dos documentos", () => {
  it("é a versão vigente do servidor, e o servidor a conhece", () => {
    const vigente = config.match(/VERSAO_DOCUMENTOS_VIGENTE = "([^"]+)"/)?.[1];

    expect(VERSAO_DOCUMENTOS).toBe(vigente);
    expect(config).toContain("VERSOES_DE_DOCUMENTOS_CONHECIDAS = [");
  });

  it("cabe no campo do banco (varchar 20) e tem o formato AAAA-MM-DD", () => {
    expect(VERSAO_DOCUMENTOS).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(VERSAO_DOCUMENTOS.length).toBeLessThanOrEqual(20);
  });

  it("os dois documentos mostram a versão que será gravada no aceite", () => {
    expect(TERMOS_DE_USO.resumo).toContain(VERSAO_DOCUMENTOS);
    expect(AVISO_DE_PRIVACIDADE.resumo).toContain(VERSAO_DOCUMENTOS);
  });
});

describe.each(Object.values(DOCUMENTOS))("$titulo", (documento) => {
  it("tem as seções numeradas em sequência, sem pular nem repetir", () => {
    const numeros = documento.secoes.map((s) => Number(s.titulo.match(/^(\d+)\./)?.[1]));

    expect(numeros).toEqual(documento.secoes.map((_, i) => i + 1));
  });

  it("só cita itens que existem", () => {
    const texto = documento.secoes.flatMap((s) => s.paragrafos).join(" ");
    const citados = [...texto.matchAll(/\bitem (\d+)\b/g)].map((m) => Number(m[1]));

    for (const item of citados) {
      expect(item).toBeGreaterThanOrEqual(1);
      expect(item).toBeLessThanOrEqual(documento.secoes.length);
    }
  });

  it("não deixa parágrafo vazio nem título sem conteúdo", () => {
    for (const secao of documento.secoes) {
      expect(secao.paragrafos.length).toBeGreaterThan(0);
      expect(secao.paragrafos.every((p) => p.trim().length > 20)).toBe(true);
    }
  });
});

describe("o que o Aviso promete sobre dado sensível", () => {
  const texto = AVISO_DE_PRIVACIDADE.secoes.flatMap((s) => s.paragrafos).join("\n");

  it("não diz mais que a deficiência só aparece para empresas com candidatura", () => {
    // Era falso: a categoria declarada aparece no perfil. O texto agora diz isso, e o que continua privado.
    expect(texto).not.toContain("Empresas só veem essa informação quando você se candidata");
    expect(texto).toContain("As empresas não conseguem buscar candidatos por deficiência");
  });

  it("lista o que é público e o que é privado", () => {
    expect(texto).toContain("Público, para quem puder ver o seu perfil");
    expect(texto).toContain("Privado, visível só para você");
    for (const privado of ["CPF", "data de nascimento", "endereço", "necessidades de acessibilidade", "currículo"]) {
      expect(texto).toContain(privado);
    }
  });

  it("não promete um novo aceite obrigatório que o sistema não faz", () => {
    const termos = TERMOS_DE_USO.secoes.flatMap((s) => s.paragrafos).join("\n");

    expect(termos).not.toContain("precisará aceitar a nova versão");
  });
});
