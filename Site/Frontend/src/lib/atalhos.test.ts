import { describe, expect, it } from "vitest";

import { ATALHOS, ESTADO_INICIAL, JANELA_DA_SEQUENCIA_MS, atalhosDisponiveis, estaDigitando, interpretarTecla, textoDasTeclas, type ContextoDosAtalhos, type TeclaApertada } from "@/lib/atalhos";

const contexto = (extra: Partial<ContextoDosAtalhos> = {}): ContextoDosAtalhos => ({ ativados: true, autenticado: true, tipoDeUsuario: "candidato", dialogoAberto: false, ...extra });

const tecla = (key: string, extra: Partial<TeclaApertada> = {}): TeclaApertada => ({ key, ctrlKey: false, altKey: false, metaKey: false, alvo: document.body, ...extra });

describe("sequências G + letra", () => {
  it("G e depois V leva às vagas", () => {
    const a = interpretarTecla(ESTADO_INICIAL, tecla("g"), contexto(), 1000);

    expect(a.acao).toBeNull();
    expect(a.estado.primeira).toBe("g");

    const b = interpretarTecla(a.estado, tecla("v"), contexto(), 1500);

    expect(b.acao).toEqual({ tipo: "navegar", para: "/vagas" });
    expect(b.estado).toEqual(ESTADO_INICIAL);
  });

  it("aceita maiúscula (Shift ou Caps Lock)", () => {
    const a = interpretarTecla(ESTADO_INICIAL, tecla("G"), contexto(), 0);

    expect(interpretarTecla(a.estado, tecla("M"), contexto(), 100).acao).toEqual({ tipo: "navegar", para: "/mensagens" });
  });

  it("a segunda tecla fora da janela de tempo não vale", () => {
    const a = interpretarTecla(ESTADO_INICIAL, tecla("g"), contexto(), 0);

    expect(interpretarTecla(a.estado, tecla("v"), contexto(), JANELA_DA_SEQUENCIA_MS + 1).acao).toBeNull();
  });

  it("uma segunda tecla sem sentido cancela a sequência", () => {
    const a = interpretarTecla(ESTADO_INICIAL, tecla("g"), contexto(), 0);
    const b = interpretarTecla(a.estado, tecla("z"), contexto(), 100);

    expect(b.acao).toBeNull();
    expect(b.estado).toEqual(ESTADO_INICIAL);
  });

  it("V sozinha não faz nada", () => {
    expect(interpretarTecla(ESTADO_INICIAL, tecla("v"), contexto(), 0).acao).toBeNull();
  });

  it("G e depois D leva ao painel certo para cada tipo de conta", () => {
    const g = interpretarTecla(ESTADO_INICIAL, tecla("g"), contexto({ tipoDeUsuario: "empresa" }), 0).estado;

    expect(interpretarTecla(g, tecla("d"), contexto({ tipoDeUsuario: "empresa" }), 10).acao).toEqual({ tipo: "navegar", para: "/dashboard/empresa" });
    expect(interpretarTecla(g, tecla("d"), contexto({ tipoDeUsuario: "candidato" }), 10).acao).toEqual({ tipo: "navegar", para: "/dashboard/candidato" });
  });
});

describe("teclas soltas", () => {
  it("/ abre a pesquisa e ? mostra a ajuda", () => {
    expect(interpretarTecla(ESTADO_INICIAL, tecla("/"), contexto(), 0).acao).toEqual({ tipo: "pesquisar" });
    expect(interpretarTecla(ESTADO_INICIAL, tecla("?"), contexto(), 0).acao).toEqual({ tipo: "ajuda" });
  });
});

describe("quando os atalhos NÃO podem agir", () => {
  it("desligados nas preferências", () => {
    const g = interpretarTecla(ESTADO_INICIAL, tecla("g"), contexto({ ativados: false }), 0);

    expect(g.estado).toEqual(ESTADO_INICIAL);
    expect(interpretarTecla(ESTADO_INICIAL, tecla("?"), contexto({ ativados: false }), 0).acao).toBeNull();
  });

  it("com Ctrl, Alt ou Meta apertados (atalhos do navegador e de leitores de tela)", () => {
    expect(interpretarTecla(ESTADO_INICIAL, tecla("g", { ctrlKey: true }), contexto(), 0).estado).toEqual(ESTADO_INICIAL);
    expect(interpretarTecla(ESTADO_INICIAL, tecla("/", { altKey: true }), contexto(), 0).acao).toBeNull();
    expect(interpretarTecla(ESTADO_INICIAL, tecla("?", { metaKey: true }), contexto(), 0).acao).toBeNull();
  });

  it("enquanto a pessoa digita ou escolhe em um campo", () => {
    document.body.innerHTML = `<input id="t" type="text" /><textarea id="a"></textarea><select id="s"></select><div id="e" contenteditable="true"></div><input id="c" type="checkbox" /><div id="cb" role="combobox"></div>`;

    for (const id of ["t", "a", "s", "e", "cb"]) {
      const alvo = document.getElementById(id);

      expect(estaDigitando(alvo), id).toBe(true);
      expect(interpretarTecla(ESTADO_INICIAL, tecla("?", { alvo }), contexto(), 0).acao, id).toBeNull();
      expect(interpretarTecla(ESTADO_INICIAL, tecla("g", { alvo }), contexto(), 0).estado.primeira, id).toBeNull();
    }

    // Uma caixa de seleção não é digitação.
    expect(estaDigitando(document.getElementById("c"))).toBe(false);
  });

  it("com um diálogo aberto", () => {
    expect(interpretarTecla(ESTADO_INICIAL, tecla("?"), contexto({ dialogoAberto: true }), 0).acao).toBeNull();
  });

  it("teclas repetidas (segurar a tecla) e teclas especiais", () => {
    expect(interpretarTecla(ESTADO_INICIAL, tecla("g", { repetida: true }), contexto(), 0).estado).toEqual(ESTADO_INICIAL);
    expect(interpretarTecla(ESTADO_INICIAL, tecla("Enter"), contexto(), 0).acao).toBeNull();
    expect(interpretarTecla(ESTADO_INICIAL, tecla("Tab"), contexto(), 0).acao).toBeNull();
  });
});

describe("visitante sem sessão", () => {
  const visitante = contexto({ autenticado: false, tipoDeUsuario: null });

  it("só tem os atalhos públicos", () => {
    const g = interpretarTecla(ESTADO_INICIAL, tecla("g"), visitante, 0).estado;

    expect(interpretarTecla(g, tecla("v"), visitante, 10).acao).toEqual({ tipo: "navegar", para: "/vagas" });
    expect(interpretarTecla(g, tecla("m"), visitante, 10).acao).toBeNull();
    expect(interpretarTecla(ESTADO_INICIAL, tecla("/"), visitante, 0).acao).toBeNull();
    expect(interpretarTecla(ESTADO_INICIAL, tecla("?"), visitante, 0).acao).toEqual({ tipo: "ajuda" });
  });

  it("a lista de ajuda para visitante não mostra atalhos privados", () => {
    const lista = atalhosDisponiveis(false);

    expect(lista.every((a) => a.publico)).toBe(true);
    expect(lista.length).toBeLessThan(ATALHOS.length);
  });
});

describe("integridade da lista", () => {
  it("não há duas ações com as mesmas teclas", () => {
    const chaves = ATALHOS.map((a) => a.teclas.join("+"));

    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("toda sequência começa por G e toda descrição existe", () => {
    for (const a of ATALHOS) {
      expect(a.descricao.length).toBeGreaterThan(5);
      if (a.teclas.length === 2) expect(a.teclas[0]).toBe("g");
    }
  });

  it("textoDasTeclas mostra letras em maiúscula", () => {
    expect(textoDasTeclas(["g", "v"])).toBe("G depois V");
    expect(textoDasTeclas(["/"])).toBe("/");
    expect(textoDasTeclas(["?"])).toBe("?");
  });
});
