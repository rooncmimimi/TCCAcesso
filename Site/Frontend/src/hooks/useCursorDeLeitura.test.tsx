import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { falar, parar, estado } = vi.hoisted(() => ({
  falar: vi.fn(),
  parar: vi.fn(),
  estado: { screenReader: true, arrowReading: true, reduceMotion: false },
}));

vi.mock("@/hooks/useAcessibilidade", () => ({ useAcessibilidade: () => ({ preferencias: estado }) }));
vi.mock("@/hooks/useVoz", () => ({ useVoz: () => ({ falar, parar }) }));
// O leitor destacado de verdade fala por `falar` e destaca; aqui ele só repete o texto do bloco.
const { pararLeitura } = vi.hoisted(() => ({ pararLeitura: vi.fn() }));
vi.mock("@/hooks/useLeituraDestacada", () => ({
  useLeituraDestacada: () => ({
    ler: (el: HTMLElement, o?: { prefixo?: string }) => falar(`${o?.prefixo ?? ""}${el.textContent}`),
    parar: pararLeitura,
  }),
}));

const { useCursorDeLeitura } = await import("./useCursorDeLeitura");

function Pagina({ html }: { html: string }) {
  useCursorDeLeitura();
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Aperta a tecla no elemento focado (ou no body) e diz se o cursor tomou a seta. */
function apertar(key: string, opcoes: KeyboardEventInit = {}, alvo: Element = document.activeElement ?? document.body) {
  const evento = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opcoes });
  act(() => {
    alvo.dispatchEvent(evento);
  });
  return evento;
}

const marcado = () => document.querySelector('[data-speaking="true"]');

beforeEach(() => {
  vi.clearAllMocks();
  estado.screenReader = true;
  estado.arrowReading = true;
  estado.reduceMotion = false;
});

afterEach(() => cleanup());

describe("useCursorDeLeitura", () => {
  it("↓ lê o primeiro bloco, marca na tela e segura a rolagem da página", () => {
    render(<Pagina html="<h1>Vagas</h1><p>Texto da página.</p>" />);

    const evento = apertar("ArrowDown");

    expect(evento.defaultPrevented).toBe(true);
    expect(falar).toHaveBeenCalledWith("Título de nível 1: Vagas");
  });

  it("↓ e ↑ andam bloco a bloco", () => {
    render(<Pagina html="<h1>Vagas</h1><p>Primeiro.</p><p>Segundo.</p>" />);

    apertar("ArrowDown");
    apertar("ArrowDown");
    apertar("ArrowDown");
    expect(falar).toHaveBeenLastCalledWith("Segundo.");

    apertar("ArrowUp");
    expect(falar).toHaveBeenLastCalledWith("Primeiro.");
  });

  it("bloco que não pode ser destacado por palavra (item com sublista) é marcado pelo cursor, uma marca só", () => {
    render(<Pagina html="<ul><li>Pai<ul><li>Filho</li></ul></li></ul>" />);

    apertar("ArrowDown");
    expect(falar).toHaveBeenLastCalledWith("Pai");
    expect(marcado()?.tagName).toBe("LI");

    apertar("ArrowDown");
    expect(falar).toHaveBeenLastCalledWith("Filho");
    // O "Filho" é um bloco destacável: a marca do pai some, e o leitor destacado cuida do resto.
    expect(marcado()).toBeNull();
  });

  it("avisa o fim e o começo da página sem sair do lugar", () => {
    render(<Pagina html="<p>Único.</p>" />);

    apertar("ArrowDown");
    apertar("ArrowDown");
    expect(falar).toHaveBeenLastCalledWith("Fim da página.");

    apertar("ArrowUp");
    expect(falar).toHaveBeenLastCalledWith("Início da página.");
  });

  it("controle recebe o foco de verdade; quem fala é a leitura por foco, não o cursor", () => {
    render(<Pagina html='<p>Antes.</p><button id="b">Candidatar-se</button>' />);

    apertar("ArrowDown");
    falar.mockClear();
    apertar("ArrowDown");

    expect(document.activeElement).toBe(document.getElementById("b"));
    expect(falar).not.toHaveBeenCalled();
    expect(marcado()).toBeNull();
  });

  it("controle que não aceita foco (desabilitado) é lido pelo cursor", () => {
    render(<Pagina html="<button disabled>Enviar</button>" />);

    apertar("ArrowDown");

    expect(falar).toHaveBeenCalledWith("Enviar, botão, desabilitado.");
    expect(marcado()?.tagName).toBe("BUTTON");
  });

  it("ao passar de um controle para texto, tira o foco do controle (Enter não aciona o botão que ficou)", () => {
    render(<Pagina html='<button id="b">Salvar</button><p>Depois.</p>' />);
    const botao = document.getElementById("b") as HTMLButtonElement;
    act(() => botao.focus());

    apertar("ArrowDown");

    expect(document.activeElement).not.toBe(botao);
    expect(falar).toHaveBeenLastCalledWith("Depois.");
  });

  it("depois de um Tab, a seta continua dali", () => {
    render(<Pagina html='<p>A.</p><button id="b">Meio</button><p>C.</p>' />);
    act(() => document.getElementById("b")!.focus());

    apertar("ArrowDown");

    expect(falar).toHaveBeenLastCalledWith("C.");
  });

  it("campo de texto de uma linha não prende: ↓ segue para o próximo bloco", () => {
    render(<Pagina html='<input id="alvo" type="email" aria-label="E-mail" /><p>Depois do campo.</p>' />);
    const campo = document.getElementById("alvo") as HTMLInputElement;
    act(() => campo.focus());

    const evento = apertar("ArrowDown");

    expect(evento.defaultPrevented).toBe(true);
    expect(falar).toHaveBeenLastCalledWith("Depois do campo.");
    expect(document.activeElement).not.toBe(campo);
  });

  it.each([
    ["campo numérico", '<input id="alvo" type="number" aria-label="Idade" />'],
    ["campo com sugestões", '<input id="alvo" type="text" aria-label="Cargo" aria-autocomplete="list" />'],
    ["área de texto",'<textarea id="alvo" aria-label="Mensagem"></textarea>'],
    ["lista de opções", '<ul role="listbox"><li id="alvo" role="option" tabindex="0">SP</li></ul>'],
    ["grupo de rádio", '<div role="radiogroup"><button id="alvo" role="radio">A</button></div>'],
  ])("não toma a seta em %s", (_nome, html) => {
    render(<Pagina html={`${html}<p>Texto.</p>`} />);
    act(() => document.getElementById("alvo")!.focus());

    const evento = apertar("ArrowDown");

    expect(evento.defaultPrevented).toBe(false);
    expect(falar).not.toHaveBeenCalled();
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Alt", { altKey: true }],
    ["Shift", { shiftKey: true }],
    ["Meta", { metaKey: true }],
  ])("não toma a seta com %s apertado", (_nome, opcoes) => {
    render(<Pagina html="<p>Texto.</p>" />);

    const evento = apertar("ArrowDown", opcoes);

    expect(evento.defaultPrevented).toBe(false);
    expect(falar).not.toHaveBeenCalled();
  });

  it("não toma ← e → (só ↑ e ↓)", () => {
    render(<Pagina html="<p>Texto.</p>" />);

    expect(apertar("ArrowRight").defaultPrevented).toBe(false);
    expect(apertar("ArrowLeft").defaultPrevented).toBe(false);
    expect(falar).not.toHaveBeenCalled();
  });

  it("respeita quem já tratou a tecla antes (defaultPrevented)", () => {
    render(<Pagina html="<p>Texto.</p>" />);
    const tratar = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", tratar, true);

    apertar("ArrowDown");
    window.removeEventListener("keydown", tratar, true);

    expect(falar).not.toHaveBeenCalled();
  });

  it("a tecla que o cursor toma não chega ao componente (o seletor fechado não abre)", () => {
    render(<Pagina html='<button id="b" role="combobox" aria-expanded="false">Idioma</button><p>Depois.</p>' />);
    const botao = document.getElementById("b") as HTMLButtonElement;
    const recebeu = vi.fn();
    botao.addEventListener("keydown", recebeu);
    act(() => botao.focus());

    apertar("ArrowDown");

    expect(recebeu).not.toHaveBeenCalled();
    expect(falar).toHaveBeenLastCalledWith("Depois.");
  });

  it("a seta que pertence ao componente chega até ele", () => {
    render(<Pagina html='<input id="n" type="number" aria-label="Idade" />' />);
    const campo = document.getElementById("n") as HTMLInputElement;
    const recebeu = vi.fn();
    campo.addEventListener("keydown", recebeu);
    act(() => campo.focus());

    apertar("ArrowDown");

    expect(recebeu).toHaveBeenCalledTimes(1);
  });

  it("dentro de um diálogo aberto, o cursor fica só no diálogo", () => {
    render(<Pagina html='<p>Fundo.</p><div role="dialog"><p>Dentro.</p></div>' />);

    apertar("ArrowDown");
    expect(falar).toHaveBeenLastCalledWith("Dentro.");

    apertar("ArrowUp");
    expect(falar).toHaveBeenLastCalledWith("Início da página.");
  });

  it("Esc para a leitura destacada e a fala", () => {
    render(<Pagina html="<p>Texto.</p>" />);
    apertar("ArrowDown");

    apertar("Escape");

    expect(pararLeitura).toHaveBeenCalled();
    expect(parar).toHaveBeenCalled();
  });

  it("Esc apaga a marca de um bloco marcado pelo cursor", () => {
    render(<Pagina html="<ul><li>Pai<ul><li>Filho</li></ul></li></ul>" />);
    apertar("ArrowDown");
    expect(marcado()).not.toBeNull();

    apertar("Escape");

    expect(marcado()).toBeNull();
  });

  it("Esc sem nada marcado não faz nada (deixa fechar diálogos e menus)", () => {
    render(<Pagina html="<p>Texto.</p>" />);

    apertar("Escape");

    expect(parar).not.toHaveBeenCalled();
  });

  it("desligado: nem com a leitura por voz ligada nem sem ela o cursor age", () => {
    estado.arrowReading = false;
    const { unmount } = render(<Pagina html="<p>Texto.</p>" />);
    expect(apertar("ArrowDown").defaultPrevented).toBe(false);
    unmount();

    estado.arrowReading = true;
    estado.screenReader = false;
    render(<Pagina html="<p>Texto.</p>" />);
    expect(apertar("ArrowDown").defaultPrevented).toBe(false);

    expect(falar).not.toHaveBeenCalled();
  });

  it("ao desligar, tira a marca da tela", () => {
    const { unmount } = render(<Pagina html="<ul><li>Pai<ul><li>Filho</li></ul></li></ul>" />);
    apertar("ArrowDown");
    expect(marcado()).not.toBeNull();

    unmount();

    expect(marcado()).toBeNull();
  });
});
