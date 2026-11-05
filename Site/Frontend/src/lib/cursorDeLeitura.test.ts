import { beforeEach, describe, expect, it } from "vitest";

import { acharParada, listarParadas, raizDaLeitura, setaPertenceAoComponente } from "./cursorDeLeitura";

/**
 * O jsdom não faz layout e não tem `innerText`; por isso o texto sai do `textContent` e a
 * visibilidade vem de `hidden`, `aria-hidden` e `style` inline.
 */
function montar(html: string): HTMLElement {
  document.body.innerHTML = `<div id="raiz">${html}</div>`;
  return document.getElementById("raiz")!;
}

const falas = (raiz: HTMLElement) => listarParadas(raiz).map((p) => p.fala);

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("listarParadas", () => {
  it("lista títulos, textos, imagens e controles na ordem da página", () => {
    const raiz = montar(`
      <h1>Vagas abertas</h1>
      <p>Encontre sua próxima oportunidade.</p>
      <img src="x.png" alt="Equipe reunida" />
      <button>Candidatar-se</button>
    `);

    expect(falas(raiz)).toEqual([
      "Título de nível 1: Vagas abertas.",
      "Encontre sua próxima oportunidade.",
      "Imagem: Equipe reunida.",
      "Candidatar-se, botão.",
    ]);
  });

  it("marca controles e textos com o tipo certo", () => {
    const raiz = montar(`<p>Texto</p><a href="/x">Ver mais</a>`);

    expect(listarParadas(raiz).map((p) => p.tipo)).toEqual(["texto", "controle"]);
  });

  it("anuncia o nível pelo aria-level quando o título não é h1 a h6", () => {
    const raiz = montar(`<div role="heading" aria-level="3">Requisitos</div><div role="heading">Sem nível</div>`);

    expect(falas(raiz)).toEqual(["Título de nível 3: Requisitos.", "Título: Sem nível."]);
  });

  it("não põe um segundo ponto num título que já termina em pontuação", () => {
    const raiz = montar(`<h1>Conectando talentos a oportunidades.</h1><h2>Quer saber mais?</h2>`);

    expect(falas(raiz)).toEqual(["Título de nível 1: Conectando talentos a oportunidades.", "Título de nível 2: Quer saber mais?"]);
  });

  it("lê o parágrafo inteiro e também o link que está no meio dele", () => {
    const raiz = montar(`<p>Já tem conta? <a href="/entrar">Entrar</a></p>`);

    expect(falas(raiz)).toEqual(["Já tem conta? Entrar", "Entrar, link."]);
  });

  it("não repete um item de lista ou título que só embrulha um link", () => {
    const raiz = montar(`
      <ul><li><a href="/vagas">Vagas</a></li></ul>
      <h3><a href="/vaga/1">Analista</a></h3>
    `);

    expect(falas(raiz)).toEqual(["Vagas, link.", "Analista, link."]);
  });

  it("em item de lista com sublista, lê o texto do item e depois os itens de dentro", () => {
    const raiz = montar(`<ul><li>Benefícios<ul><li>Vale-refeição</li><li>Plano de saúde</li></ul></li></ul>`);

    expect(falas(raiz)).toEqual(["Benefícios", "Vale-refeição", "Plano de saúde"]);
  });

  it("ignora o que está oculto: hidden, aria-hidden e display none", () => {
    const raiz = montar(`
      <p hidden>Escondido pelo atributo</p>
      <p aria-hidden="true">Escondido do leitor</p>
      <div style="display:none"><p>Escondido pelo estilo</p><button>Invisível</button></div>
      <p>Visível</p>
    `);

    expect(falas(raiz)).toEqual(["Visível"]);
  });

  it("ignora texto só para leitor de tela nativo (sr-only), mas mantém o controle que o contém", () => {
    const raiz = montar(`
      <p class="sr-only">Descrição repetida para NVDA</p>
      <button aria-label="Fechar"><span class="sr-only">Fechar</span></button>
    `);

    expect(falas(raiz)).toEqual(["Fechar, botão."]);
  });

  it("não descreve a imagem de dentro de um botão nem a decorativa", () => {
    const raiz = montar(`
      <button aria-label="Ampliar imagem"><img src="x.png" alt="Foto grande" /></button>
      <img src="y.png" alt="" />
    `);

    expect(falas(raiz)).toEqual(["Ampliar imagem, botão."]);
  });

  it("pula controle sem nome e campo escondido", () => {
    const raiz = montar(`<button></button><input type="hidden" name="csrf" /><input aria-label="Nome" />`);

    expect(falas(raiz)).toEqual(["Nome, campo de texto."]);
  });

  it("usa data-speak como a leitura por foco usa", () => {
    const raiz = montar(`<a href="/vaga/1" data-speak="Vaga de analista, Grupo Aurora, São Paulo.">Analista</a>`);

    expect(falas(raiz)).toEqual(["Vaga de analista, Grupo Aurora, São Paulo."]);
  });

  it("deixa de fora toasts e o widget do VLibras", () => {
    const raiz = montar(`
      <div data-sonner-toaster><p>Salvo com sucesso</p><button aria-label="Fechar aviso"></button></div>
      <div vw><button aria-label="Libras"></button></div>
      <p>Conteúdo</p>
    `);

    expect(falas(raiz)).toEqual(["Conteúdo"]);
  });

  it("corta um texto enorme na última palavra inteira", () => {
    const raiz = montar(`<p>${"palavra ".repeat(400)}</p>`);

    const [fala] = falas(raiz);
    expect(fala.length).toBeLessThanOrEqual(1201);
    expect(fala.endsWith("palavra…")).toBe(true);
  });
});

describe("acharParada", () => {
  it("anda para frente e para trás, e devolve null nas pontas", () => {
    const raiz = montar(`<h1>A</h1><p>B</p><p>C</p>`);
    const paradas = listarParadas(raiz);
    const [a, b, c] = paradas;

    expect(acharParada(paradas, a.el, 1)).toBe(b);
    expect(acharParada(paradas, b.el, 1)).toBe(c);
    expect(acharParada(paradas, c.el, 1)).toBeNull();
    expect(acharParada(paradas, c.el, -1)).toBe(b);
    expect(acharParada(paradas, a.el, -1)).toBeNull();
  });

  it("depois de um parágrafo vem o link de dentro dele, e na volta o parágrafo", () => {
    const raiz = montar(`<p>Leia os <a href="/termos">termos</a> antes.</p><p>Fim</p>`);
    const [paragrafo, link, fim] = listarParadas(raiz);

    expect(acharParada([paragrafo, link, fim], paragrafo.el, 1)).toBe(link);
    expect(acharParada([paragrafo, link, fim], link.el, 1)).toBe(fim);
    expect(acharParada([paragrafo, link, fim], link.el, -1)).toBe(paragrafo);
  });

  it("sem referência, começa pela primeira parada visível", () => {
    const raiz = montar(`<p>Primeira</p><p>Segunda</p>`);
    const paradas = listarParadas(raiz);

    expect(acharParada(paradas, null, 1)).toBe(paradas[0]);
    expect(acharParada(paradas, null, -1)).toBe(paradas[0]);
  });

  it("continua de um elemento que não é parada (foco numa div com tabindex)", () => {
    const raiz = montar(`<p>Antes</p><div id="foco" tabindex="0"></div><p>Depois</p>`);
    const paradas = listarParadas(raiz);
    const foco = document.getElementById("foco")!;

    expect(acharParada(paradas, foco, 1)?.fala).toBe("Depois");
    expect(acharParada(paradas, foco, -1)?.fala).toBe("Antes");
  });

  it("devolve null quando a página não tem paradas", () => {
    expect(acharParada([], null, 1)).toBeNull();
  });
});

describe("setaPertenceAoComponente", () => {
  const alvo = (html: string, seletor: string) => {
    montar(html);
    return document.querySelector<HTMLElement>(seletor);
  };

  it.each([
    ['<input type="number" />', "input"],
    ['<input type="radio" />', "input"],
    ['<input type="range" />', "input"],
    ['<input type="date" />', "input"],
    ['<input type="text" list="sugestoes" />', "input"],
    ['<input type="text" aria-autocomplete="list" />', "input"],
    ["<textarea></textarea>", "textarea"],
    ["<select><option>A</option></select>", "select"],
    ['<div contenteditable="true">x</div>', "[contenteditable]"],
    ['<input role="combobox" aria-expanded="false" aria-label="Estado" />', "input"],
    ['<button role="combobox" aria-expanded="true">Idioma</button>', "button"],
    ['<ul role="listbox"><li role="option" tabindex="-1">SP</li></ul>', "li"],
    ['<div role="menu"><button role="menuitem">Sair</button></div>', "button"],
    ['<div role="radiogroup"><button role="radio">A</button></div>', "button"],
    ['<span role="slider" tabindex="0"></span>', "span"],
    ['<div role="tablist" aria-orientation="vertical"><button role="tab">A</button></div>', "button"],
  ])("deixa a seta para o componente em %s", (html, seletor) => {
    expect(setaPertenceAoComponente(alvo(html, seletor))).toBe(true);
  });

  it.each([
    ["<button>Salvar</button>", "button"],
    ['<a href="/x">Link</a>', "a"],
    // Seletor do Radix fechado: ↓ só o abriria, e a pessoa ficaria presa na lista.
    ['<button role="combobox" aria-expanded="false">Idioma</button>', "button"],
    ['<button aria-haspopup="menu" aria-expanded="false">Menu</button>', "button"],
    ['<input type="text" />', "input"],
    ["<input />", "input"],
    ['<input type="email" />', "input"],
    ['<input type="password" />', "input"],
    ['<input type="search" />', "input"],
    ['<input type="checkbox" />', "input"],
    ['<input type="submit" value="Enviar" />', "input"],
    ['<button role="switch" aria-checked="false">Modo</button>', "button"],
    ['<div role="tablist"><button role="tab">A</button></div>', "button"],
    ["<p>Texto</p>", "p"],
  ])("fica com o cursor em %s", (html, seletor) => {
    expect(setaPertenceAoComponente(alvo(html, seletor))).toBe(false);
  });

  it("alvo que não é elemento (document, null) não bloqueia", () => {
    expect(setaPertenceAoComponente(document)).toBe(false);
    expect(setaPertenceAoComponente(null)).toBe(false);
  });
});

describe("raizDaLeitura", () => {
  it("sem diálogo, é a página toda", () => {
    montar(`<p>Oi</p>`);

    expect(raizDaLeitura()).toBe(document.body);
  });

  it("com diálogo aberto, é só o diálogo (o último, se houver mais de um)", () => {
    montar(`<p>Fundo</p><div role="dialog" id="d1"></div><div role="alertdialog" id="d2"></div>`);

    expect(raizDaLeitura().id).toBe("d2");
  });

  it("ignora diálogo oculto", () => {
    montar(`<div role="dialog" id="d1"></div><div role="dialog" id="d2" hidden></div>`);

    expect(raizDaLeitura().id).toBe("d1");
  });
});
