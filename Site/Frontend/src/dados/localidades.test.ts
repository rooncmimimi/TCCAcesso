import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ESTADOS_BR } from "./estados";
import { PAISES, ehCodigoDePais } from "./paises";

/**
 * A lista de países e a de estados do Site precisam bater com as do servidor
 * (`Backend/src/utils/localidades.js`): se o Site oferecer um código que a API recusa, a pessoa só
 * descobre no fim do cadastro.
 */

const servidor = readFileSync(resolve(__dirname, "../../../Backend/src/utils/localidades.js"), "utf8");

const lerLista = (nome: string): string[] => {
  const bloco = servidor.match(new RegExp(`${nome} = ([\`"])([\\s\\S]*?)\\1`));
  if (!bloco) throw new Error(`lista ${nome} não encontrada no servidor`);
  return bloco[2].trim().split(/\s+/);
};

describe("países", () => {
  it("o Site oferece exatamente os 249 códigos ISO 3166-1 que o servidor aceita", () => {
    const doServidor = lerLista("CODIGOS_ISO_3166_1");

    expect(doServidor).toHaveLength(249);
    expect(PAISES.map((p) => p.codigo).sort()).toEqual([...doServidor].sort());
  });

  it("não repete código nem nome, e todo país tem nome", () => {
    expect(new Set(PAISES.map((p) => p.codigo)).size).toBe(PAISES.length);
    expect(new Set(PAISES.map((p) => p.nome)).size).toBe(PAISES.length);
    expect(PAISES.every((p) => p.nome.trim().length > 0)).toBe(true);
  });

  it("o Brasil existe com o código BR, e códigos fora da lista são recusados", () => {
    expect(PAISES.find((p) => p.codigo === "BR")?.nome).toBe("Brasil");
    expect(ehCodigoDePais("br")).toBe(true);
    expect(ehCodigoDePais("QQ")).toBe(false);
  });
});

describe("estados", () => {
  it("o Site oferece exatamente as 27 UFs que o servidor aceita", () => {
    const doServidor = servidor.match(/SIGLAS_DOS_ESTADOS = "([^"]+)"/)![1].split(" ");

    expect(doServidor).toHaveLength(27);
    expect(ESTADOS_BR.map((e) => e.sigla).sort()).toEqual([...doServidor].sort());
  });
});
