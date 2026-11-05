import { beforeEach, describe, expect, it } from "vitest";

import { OBJETIVOS, objetivosPara } from "@/dados/objetivos";
import { CHAVE_DOS_OBJETIVOS, alternarPasso, contarFeitos, lerProgresso, proximoPasso, recomecar } from "@/lib/progressoDeObjetivos";

beforeEach(() => window.localStorage.clear());

describe("objetivos", () => {
  it("os seis objetivos do candidato pedidos existem", () => {
    const titulos = objetivosPara("candidato").map((o) => o.titulo);

    expect(titulos).toEqual(["Quero encontrar emprego", "Quero melhorar meu currículo", "Quero me candidatar", "Quero preparar uma entrevista", "Quero acompanhar minhas candidaturas", "Quero atualizar meu perfil"]);
  });

  it("empresa e visitante têm os seus; administrador não tem nenhum", () => {
    expect(objetivosPara("empresa").length).toBeGreaterThan(0);
    expect(objetivosPara(null).map((o) => o.publico)).toEqual(["visitante"]);
    expect(objetivosPara("administrador")).toEqual([]);
  });

  it("ids únicos e todo objetivo tem passos com ids únicos, textos e rota", () => {
    expect(new Set(OBJETIVOS.map((o) => o.id)).size).toBe(OBJETIVOS.length);

    for (const o of OBJETIVOS) {
      expect(o.passos.length, o.id).toBeGreaterThanOrEqual(1);
      expect(new Set(o.passos.map((p) => p.id)).size, o.id).toBe(o.passos.length);
      expect(o.passos.every((p) => p.titulo && p.descricao && p.acao && p.para.startsWith("/")), o.id).toBe(true);
      // Um objetivo nunca é só de passos opcionais.
      expect(o.passos.some((p) => !p.opcional), o.id).toBe(true);
    }
  });

  it("nenhum passo promete que o site vai fazer algo pela pessoa (enviar, publicar)", () => {
    const texto = JSON.stringify(OBJETIVOS.map((o) => o.passos.map((p) => p.acao))).toLowerCase();

    expect(texto).not.toMatch(/enviar agora|publicar agora/);
  });
});

describe("progresso", () => {
  const objetivo = OBJETIVOS[0];

  it("começa sem nada feito, com o primeiro passo como próximo", () => {
    expect(lerProgresso()).toEqual({});
    expect(proximoPasso(objetivo, {})?.id).toBe(objetivo.passos[0].id);
    expect(contarFeitos(objetivo, {})).toBe(0);
  });

  it("marca, desmarca e avança o próximo passo", () => {
    let p = alternarPasso({}, objetivo.id, objetivo.passos[0].id);

    expect(proximoPasso(objetivo, p)?.id).toBe(objetivo.passos[1].id);
    expect(contarFeitos(objetivo, p)).toBe(1);
    expect(lerProgresso()[objetivo.id]).toEqual([objetivo.passos[0].id]);

    p = alternarPasso(p, objetivo.id, objetivo.passos[0].id);
    expect(contarFeitos(objetivo, p)).toBe(0);
  });

  it("terminando todos, não há próximo passo", () => {
    let p = {};

    for (const passo of objetivo.passos) p = alternarPasso(p, objetivo.id, passo.id);

    expect(proximoPasso(objetivo, p)).toBeNull();
  });

  it("recomeçar apaga só aquele objetivo", () => {
    let p = alternarPasso({}, "a", "1");

    p = alternarPasso(p, "b", "2");
    p = recomecar(p, "a");

    expect(p).toEqual({ b: ["2"] });
    expect(lerProgresso()).toEqual({ b: ["2"] });
  });

  it("passos que não existem mais não contam", () => {
    expect(contarFeitos(objetivo, { [objetivo.id]: ["passo-antigo-que-sumiu"] })).toBe(0);
  });

  it("ignora conteúdo corrompido", () => {
    window.localStorage.setItem(CHAVE_DOS_OBJETIVOS, "{ruim");
    expect(lerProgresso()).toEqual({});

    window.localStorage.setItem(CHAVE_DOS_OBJETIVOS, JSON.stringify({ a: ["x", 3, null], b: "texto" }));
    expect(lerProgresso()).toEqual({ a: ["x"] });

    window.localStorage.setItem(CHAVE_DOS_OBJETIVOS, JSON.stringify([1, 2]));
    expect(lerProgresso()).toEqual({});
  });
});
