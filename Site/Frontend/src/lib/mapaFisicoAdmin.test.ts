import { describe, expect, it } from "vitest";

import { linhasDoMapa, resumoDoMapa, textoDoResumo } from "@/lib/mapaFisicoAdmin";
import type { AcessibilidadeFisica } from "@/types/ambiente";

const catalogo = [
  { chave: "rampa", rotulo: "Rampa de acesso" },
  { chave: "elevador", rotulo: "Elevador" },
  { chave: "banheiro", rotulo: "Banheiro adaptado" },
];

const mapa: AcessibilidadeFisica = {
  banheiro: { situacao: "parcial", origem: "declarado", detalhe: "Só no térreo" },
  rampa: { situacao: "sim", origem: "verificado", verificadoEm: "2026-11-04T12:00:00Z" },
};

describe("mapa físico (moderação)", () => {
  it("lista só os itens informados, na ordem do catálogo", () => {
    const linhas = linhasDoMapa(mapa, catalogo);

    expect(linhas.map((l) => l.chave)).toEqual(["rampa", "banheiro"]);
    expect(linhas[0]).toMatchObject({ rotulo: "Rampa de acesso", origem: "verificado" });
    expect(linhas[1]).toMatchObject({ situacao: "parcial", origem: "declarado", detalhe: "Só no térreo" });
  });

  it("ignora chaves fora do catálogo e aceita mapa vazio ou nulo", () => {
    expect(linhasDoMapa({ inventado: { situacao: "sim", origem: "declarado" } }, catalogo)).toEqual([]);
    expect(linhasDoMapa(null, catalogo)).toEqual([]);
    expect(linhasDoMapa(undefined, catalogo)).toEqual([]);
  });

  it("origem desconhecida conta como declarada (nunca como verificada)", () => {
    const [linha] = linhasDoMapa({ rampa: { situacao: "sim", origem: "qualquer" as never } }, catalogo);

    expect(linha.origem).toBe("declarado");
  });

  it("resume informados e verificados em texto", () => {
    expect(resumoDoMapa(mapa)).toEqual({ informados: 2, verificados: 1 });
    expect(textoDoResumo(resumoDoMapa(mapa))).toBe("Mapa físico: 2 itens, 1 verificado");
    expect(textoDoResumo(resumoDoMapa({}))).toBe("Mapa físico: não informado");
    expect(textoDoResumo({ informados: 1, verificados: 0 })).toBe("Mapa físico: 1 item, nenhum verificado");
    expect(textoDoResumo({ informados: 3, verificados: 3 })).toBe("Mapa físico: 3 itens, 3 verificados");
  });
});
