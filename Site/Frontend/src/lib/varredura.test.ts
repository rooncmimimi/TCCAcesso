import { beforeEach, describe, expect, it } from "vitest";

import { coletarControles, ehCampoDeTexto, montarItens, nomeDoControle, raizDaVarredura, tipoDoControle } from "@/lib/varredura";

const montar = (html: string) => {
  document.body.innerHTML = html;
};

const nomes = (els: HTMLElement[]) => els.map((e) => nomeDoControle(e));

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("coletarControles: o que entra na varredura", () => {
  it("reconhece botões, links com destino, campos, seletores, caixas e papéis interativos", () => {
    montar(`
      <button>Entrar</button>
      <a href="/vagas">Vagas</a>
      <label for="e">E-mail</label><input id="e" type="email" />
      <label for="s">Estado</label><select id="s"><option>SP</option></select>
      <label for="c">Aceito</label><input id="c" type="checkbox" />
      <div role="switch" aria-label="Modo escuro" tabindex="0"></div>
      <textarea aria-label="Mensagem"></textarea>
      <summary>Mais detalhes</summary>
    `);

    expect(nomes(coletarControles(document.body))).toEqual(["Entrar", "Vagas", "E-mail", "Estado", "Aceito", "Modo escuro", "Mensagem", "Mais detalhes"]);
  });

  it("ignora o que é decorativo: link sem destino, ícone sem nome, campo oculto", () => {
    montar(`
      <a>sem destino</a>
      <button><svg aria-hidden="true"></svg></button>
      <input type="hidden" value="x" />
      <div tabindex="-1">foco programático</div>
      <button>Real</button>
    `);

    expect(nomes(coletarControles(document.body))).toEqual(["Real"]);
  });

  it("ignora desligados, escondidos e fora do alcance de leitores de tela", () => {
    montar(`
      <button disabled>Desligado</button>
      <button aria-disabled="true">Também desligado</button>
      <button hidden>Oculto</button>
      <div style="display:none"><button>Dentro de oculto</button></div>
      <div style="visibility:hidden"><button>Invisível</button></div>
      <div aria-hidden="true"><button>Atrás do diálogo</button></div>
      <div inert><button>Inerte</button></div>
      <div style="clip-path:inset(50%)"><button>Recortado por clip-path</button></div>
      <button>Visível</button>
    `);

    expect(nomes(coletarControles(document.body))).toEqual(["Visível"]);
  });

  it("nunca varre o painel da própria varredura", () => {
    montar(`<div data-varredura-ignorar><button>Pausar</button></div><button>Salvar</button>`);

    expect(nomes(coletarControles(document.body))).toEqual(["Salvar"]);
  });

  it("o nome vem do aria-label, do rótulo associado, do texto ou do alt da imagem", () => {
    montar(`
      <button aria-label="Fechar janela">X</button>
      <span id="t">Enviar currículo</span><button aria-labelledby="t"></button>
      <button><img alt="Perfil" src="x.png" /></button>
      <input type="submit" value="Buscar" />
      <input type="text" placeholder="Cidade" />
    `);

    expect(nomes(coletarControles(document.body))).toEqual(["Fechar janela", "Enviar currículo", "Perfil", "Buscar", "Cidade"]);
  });
});

describe("tipoDoControle e ehCampoDeTexto", () => {
  it("diz o que cada controle é", () => {
    montar(`
      <button id="b">B</button><a id="a" href="/x">A</a><input id="t" type="text" aria-label="T" /><input id="k" type="checkbox" aria-label="K" />
      <input id="r" type="radio" aria-label="R" /><select id="s" aria-label="S"></select><div id="w" role="switch" aria-label="W" tabindex="0"></div>
      <input id="sub" type="submit" value="Ok" /><input id="rg" type="range" aria-label="G" />
    `);

    const t = (id: string) => tipoDoControle(document.getElementById(id)!);

    expect([t("b"), t("a"), t("t"), t("k"), t("r"), t("s"), t("w"), t("sub"), t("rg")]).toEqual(["Botão", "Link", "Campo", "Caixa de seleção", "Opção", "Lista de escolha", "Interruptor", "Botão", "Controle deslizante"]);
  });

  it("campos em que se digita ganham o foco em vez do clique", () => {
    montar(`<input id="t" type="text" /><textarea id="a"></textarea><select id="s"></select><input id="k" type="checkbox" /><button id="b">B</button><input id="e" type="email" />`);

    const campo = (id: string) => ehCampoDeTexto(document.getElementById(id)!);

    expect([campo("t"), campo("a"), campo("s"), campo("k"), campo("b"), campo("e")]).toEqual([true, true, true, false, false, true]);
  });
});

describe("raizDaVarredura: a camada de cima", () => {
  it("sem diálogo aberto, a página inteira", () => {
    montar(`<button>Fora</button>`);

    expect(raizDaVarredura(document)).toBe(document.body);
  });

  it("com diálogo aberto, só o diálogo (o último, se houver mais de um)", () => {
    montar(`<button>Fora</button><div role="dialog" data-state="open" id="d1"><button>Um</button></div><div role="dialog" data-state="open" id="d2"><button>Dois</button></div>`);

    const raiz = raizDaVarredura(document) as HTMLElement;

    expect(raiz.id).toBe("d2");
    expect(nomes(coletarControles(raiz))).toEqual(["Dois"]);
  });

  it("diálogo fechado ou escondido não conta", () => {
    montar(`<div role="dialog" data-state="closed"><button>Fechado</button></div><div role="dialog" data-state="open" hidden><button>Oculto</button></div><button>Página</button>`);

    expect(raizDaVarredura(document)).toBe(document.body);
  });
});

describe("montarItens: grupos", () => {
  const estrutura = `
    <header><a href="/">Início</a><a href="/vagas">Vagas</a><a href="/msg">Mensagens</a></header>
    <main>
      <h1>Página</h1>
      <button id="solto">Solto no conteúdo</button>
      <section><h2>Filtros</h2><button>Aplicar</button><button>Limpar</button></section>
      <article aria-label="Vaga de atendente"><button>Ver vaga</button></article>
    </main>
  `;

  it("sem grupos: lista simples, na ordem da página", () => {
    montar(estrutura);

    const itens = montarItens(document.body, false);

    expect(itens.map((i) => i.rotulo)).toEqual(["Link: Início", "Link: Vagas", "Link: Mensagens", "Botão: Solto no conteúdo", "Botão: Aplicar", "Botão: Limpar", "Botão: Ver vaga"]);
    expect(itens.every((i) => !i.filhos)).toBe(true);
  });

  it("com grupos: o cabeçalho e a seção viram um item cada; controle único e solto ficam diretos", () => {
    montar(estrutura);

    const itens = montarItens(document.body, true);

    expect(itens.map((i) => i.rotulo)).toEqual(["Grupo: Cabeçalho, 3 controles", "Botão: Solto no conteúdo", "Grupo: Filtros, 2 controles", "Botão: Ver vaga"]);
    expect(itens[0].filhos?.map((f) => f.rotulo)).toEqual(["Link: Início", "Link: Vagas", "Link: Mensagens"]);
  });

  it("um controle sem grupo que vem depois de um grupo não passa na frente dele", () => {
    montar(`<section aria-label="A"><button>A1</button></section><button>Meio</button><nav aria-label="Menu"><a href="/1">M1</a><a href="/2">M2</a></nav><button>Fim</button>`);

    expect(montarItens(document.body, true).map((i) => i.rotulo)).toEqual(["Botão: A1", "Botão: Meio", "Grupo: Menu, 2 controles", "Botão: Fim"]);
  });

  it("dentro de um diálogo aberto, o próprio diálogo não vira grupo", () => {
    montar(`<div role="dialog" data-state="open" id="d"><button>Cancelar</button><button>Confirmar</button></div>`);

    const itens = montarItens(document.getElementById("d")!, true);

    expect(itens.map((i) => i.rotulo)).toEqual(["Botão: Cancelar", "Botão: Confirmar"]);
  });

  it("página sem controles: lista vazia", () => {
    montar(`<p>Só texto</p>`);

    expect(montarItens(document.body, true)).toEqual([]);
  });
});
