import { describe, expect, it } from "vitest";

import { imagensSemDescricao } from "@/lib/imagensSemDescricao";
import type { PostagemCompleta } from "@/types";

const post = (id: string, anexos: Array<{ id: string; tipo: "imagem" | "documento" | "video"; descricao?: string | null }>, conteudo = "texto") =>
  ({ id, conteudo, anexos: anexos.map((a) => ({ url: "x", ...a })) }) as unknown as PostagemCompleta;

describe("imagensSemDescricao", () => {
  it("lista só imagens sem descrição", () => {
    const lista = imagensSemDescricao([
      post("p1", [
        { id: "a1", tipo: "imagem", descricao: null },
        { id: "a2", tipo: "imagem", descricao: "Uma rampa de acesso" },
        { id: "a3", tipo: "documento" },
        { id: "a4", tipo: "video" },
      ]),
    ]);

    expect(lista.map((i) => i.anexo.id)).toEqual(["a1"]);
    expect(lista[0].postagemId).toBe("p1");
  });

  it("trata descrição só com espaços como ausente", () => {
    expect(imagensSemDescricao([post("p1", [{ id: "a1", tipo: "imagem", descricao: "   " }])])).toHaveLength(1);
  });

  it("aceita publicação sem anexos e devolve vazio quando está tudo descrito", () => {
    expect(imagensSemDescricao([{ id: "p0", conteudo: "oi" } as unknown as PostagemCompleta])).toEqual([]);
    expect(imagensSemDescricao([post("p1", [{ id: "a1", tipo: "imagem", descricao: "ok" }])])).toEqual([]);
  });

  it("encurta o trecho da publicação", () => {
    const [item] = imagensSemDescricao([post("p1", [{ id: "a1", tipo: "imagem" }], "palavra ".repeat(40))]);

    expect(item.trechoDaPublicacao.length).toBeLessThanOrEqual(81);
    expect(item.trechoDaPublicacao.endsWith("…")).toBe(true);
  });
});
