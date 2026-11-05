import { describe, expect, it } from "vitest";

import { ESTADO_PARADO, atualizarItens, avancar, continuar, dentroDeGrupo, grupoAtual, iniciar, itemAtual, itensDoNivel, parar, pausar, sairDoGrupo, selecionar, voltar } from "@/lib/motorDeVarredura";
import type { Item } from "@/lib/varredura";

const el = (id: string) => {
  const e = document.createElement("button");

  e.id = id;

  return e;
};

const controle = (id: string): Item => ({ elemento: el(id), rotulo: `Botão: ${id}` });
const grupo = (id: string, ...filhos: string[]): Item => ({ elemento: el(id), rotulo: `Grupo: ${id}`, filhos: filhos.map(controle) });

const ids = (estado: ReturnType<typeof iniciar>) => itemAtual(estado)?.elemento.id;

describe("iniciar, pausar, continuar e parar", () => {
  it("iniciar com itens começa rodando no primeiro", () => {
    const e = iniciar([controle("a"), controle("b")]);

    expect(e.fase).toBe("rodando");
    expect(ids(e)).toBe("a");
  });

  it("sem itens, a varredura não começa", () => {
    expect(iniciar([]).fase).toBe("parada");
    expect(itemAtual(iniciar([]))).toBeNull();
  });

  it("pausar mantém o destaque; continuar volta a rodar; parar zera tudo", () => {
    const e = avancar(iniciar([controle("a"), controle("b")]));
    const p = pausar(e);

    expect(p.fase).toBe("pausada");
    expect(ids(p)).toBe("b");
    expect(continuar(p).fase).toBe("rodando");
    expect(parar()).toBe(ESTADO_PARADO);
    expect(itemAtual(parar())).toBeNull();
  });

  it("pausar parado ou continuar rodando não muda nada", () => {
    const parado = ESTADO_PARADO;
    const rodando = iniciar([controle("a")]);

    expect(pausar(parado)).toBe(parado);
    expect(continuar(rodando)).toBe(rodando);
  });
});

describe("avançar e voltar", () => {
  it("percorre em ordem e dá a volta nas duas pontas", () => {
    let e = iniciar([controle("a"), controle("b"), controle("c")]);

    e = avancar(e);
    expect(ids(e)).toBe("b");
    e = avancar(avancar(e));
    expect(ids(e)).toBe("a");
    e = voltar(e);
    expect(ids(e)).toBe("c");
    e = voltar(e);
    expect(ids(e)).toBe("b");
  });

  it("parado, avançar e voltar não fazem nada", () => {
    expect(avancar(ESTADO_PARADO)).toBe(ESTADO_PARADO);
    expect(voltar(ESTADO_PARADO)).toBe(ESTADO_PARADO);
  });

  it("com um item só, fica nele", () => {
    const e = iniciar([controle("a")]);

    expect(ids(avancar(e))).toBe("a");
    expect(ids(voltar(e))).toBe("a");
  });

  it("avançar e voltar também funcionam enquanto está pausada (passo manual)", () => {
    const e = pausar(iniciar([controle("a"), controle("b")]));

    expect(avancar(e).fase).toBe("pausada");
    expect(ids(avancar(e))).toBe("b");
  });
});

describe("grupos", () => {
  const montar = () => iniciar([controle("solto"), grupo("menu", "m1", "m2", "m3"), controle("fim")]);

  it("selecionar um grupo entra nele, no primeiro controle", () => {
    let e = avancar(montar());
    const r = selecionar(e);

    e = r.estado;

    expect(r.efeito).toMatchObject({ tipo: "entrou-no-grupo" });
    expect(dentroDeGrupo(e)).toBe(true);
    expect(grupoAtual(e)?.elemento.id).toBe("menu");
    expect(ids(e)).toBe("m1");
    expect(itensDoNivel(e).map((i) => i.elemento.id)).toEqual(["m1", "m2", "m3"]);
  });

  it("dentro do grupo, avançar só percorre o grupo (e dá a volta nele)", () => {
    let e = selecionar(avancar(montar())).estado;

    e = avancar(avancar(avancar(e)));
    expect(ids(e)).toBe("m1");
    e = voltar(e);
    expect(ids(e)).toBe("m3");
  });

  it("selecionar um controle de dentro do grupo pede para ativá-lo", () => {
    const e = avancar(selecionar(avancar(montar())).estado);
    const r = selecionar(e);

    expect(r.efeito).toMatchObject({ tipo: "ativar" });
    expect((r.efeito as { item: Item }).item.elemento.id).toBe("m2");
  });

  it("sair do grupo volta ao primeiro nível, no próprio grupo", () => {
    const e = sairDoGrupo(avancar(selecionar(avancar(montar())).estado));

    expect(dentroDeGrupo(e)).toBe(false);
    expect(ids(e)).toBe("menu");
  });

  it("sair do grupo fora de grupo não muda nada", () => {
    const e = montar();

    expect(sairDoGrupo(e)).toBe(e);
  });

  it("selecionar um controle solto pede para ativá-lo", () => {
    expect(selecionar(montar()).efeito).toMatchObject({ tipo: "ativar" });
  });

  it("selecionar sem varredura não faz nada", () => {
    expect(selecionar(ESTADO_PARADO).efeito).toEqual({ tipo: "nenhum" });
  });
});

describe("atualizarItens: a página mudou", () => {
  it("mantém o item destacado quando ele ainda existe, mesmo em outra posição", () => {
    const a = controle("a");
    const b = controle("b");
    const c = controle("c");
    const e = avancar(iniciar([a, b, c]));
    const novo = atualizarItens(e, [controle("novo"), b, c]);

    expect(ids(novo)).toBe("b");
    expect(novo.caminho).toEqual([1]);
    expect(novo.fase).toBe("rodando");
  });

  it("mantém a posição dentro do grupo", () => {
    const menu = grupo("menu", "m1", "m2");
    const e = avancar(selecionar(iniciar([menu])).estado);
    const novo = atualizarItens(e, [controle("antes"), { ...menu }]);

    expect(ids(novo)).toBe("m2");
    expect(dentroDeGrupo(novo)).toBe(true);
    expect(novo.caminho).toEqual([1, 1]);
  });

  it("se o item destacado sumiu (rota nova), volta ao começo", () => {
    const e = avancar(iniciar([controle("a"), controle("b")]));
    const novo = atualizarItens(e, [controle("x"), controle("y")]);

    expect(novo.caminho).toEqual([0]);
    expect(ids(novo)).toBe("x");
  });

  it("se não sobrou nada para percorrer, a varredura para", () => {
    expect(atualizarItens(iniciar([controle("a")]), []).fase).toBe("parada");
  });

  it("parada, não é afetada pela mudança da página", () => {
    expect(atualizarItens(ESTADO_PARADO, [controle("a")])).toBe(ESTADO_PARADO);
  });

  it("mantém a fase (pausada continua pausada)", () => {
    const a = controle("a");
    const e = pausar(iniciar([a, controle("b")]));

    expect(atualizarItens(e, [a]).fase).toBe("pausada");
  });
});
