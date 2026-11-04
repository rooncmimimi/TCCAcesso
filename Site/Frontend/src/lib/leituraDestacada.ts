/**
 * Base do destaque de leitura: transforma o texto de um elemento em uma string para a voz e guarda,
 * para cada caractere dela, de qual nó de texto e de qual posição ele veio. Com isso, o `charIndex`
 * que a `speechSynthesis` devolve vira um `Range` exato no DOM, sem mexer nele (nada de envolver
 * palavras em `<span>`, que brigaria com o React).
 *
 * O destaque em si usa a CSS Custom Highlight API (`CSS.highlights`). Onde ela não existe, quem usa
 * cai para marcar o bloco inteiro (`suporteDestaque`).
 *
 * Funções puras, testáveis sem navegador de verdade.
 */

import { criarVerificadorDeOculto } from "@/lib/cursorDeLeitura";

export type MapaDeTexto = {
  /** O que a voz vai dizer. Já aparado: `falar` apara o texto, e o `charIndex` vale para esta string. */
  texto: string;
  /** Para cada caractere de `texto`, o nó de texto de onde ele veio. */
  nos: Text[];
  /** E a posição dele dentro desse nó. */
  posicoes: number[];
};

const MAPA_VAZIO: MapaDeTexto = { texto: "", nos: [], posicoes: [] };

/**
 * Texto visível de `raiz`, na ordem do documento, com espaços repetidos reduzidos a um. Fica de fora
 * o que um leitor de tela também ignora (oculto, `aria-hidden`) e o texto só para leitor de tela
 * (`.sr-only`), que a voz do ACESSO já não falaria.
 */
export function montarMapa(raiz: HTMLElement): MapaDeTexto {
  const oculto = criarVerificadorDeOculto();
  const caminhada = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);

  let texto = "";
  const nos: Text[] = [];
  const posicoes: number[] = [];

  const empilhar = (char: string, no: Text, posicao: number) => {
    texto += char;
    nos.push(no);
    posicoes.push(posicao);
  };

  for (let atual = caminhada.nextNode() as Text | null; atual; atual = caminhada.nextNode() as Text | null) {
    const pai = atual.parentElement;
    if (!pai || oculto(pai) || pai.closest(".sr-only, script, style, noscript")) continue;

    const dados = atual.data;
    for (let i = 0; i < dados.length; i++) {
      if (/\s/.test(dados[i])) {
        // Espaço vale uma vez só, e nunca no começo do texto.
        if (texto.length > 0 && !texto.endsWith(" ")) empilhar(" ", atual, i);
      } else {
        empilhar(dados[i], atual, i);
      }
    }
    // Dois nós seguidos (`<b>Olá</b><i>mundo</i>`) não podem virar "Olámundo": mas só separa se o
    // nó seguinte for de outro bloco. Dentro da mesma frase, o espaço já está no próprio texto.
    if (texto.length > 0 && !texto.endsWith(" ") && pertenceABlocoDiferente(atual, caminhada)) {
      empilhar(" ", atual, dados.length);
    }
  }

  // Aparar o fim (o começo já não recebe espaço).
  while (texto.endsWith(" ")) {
    texto = texto.slice(0, -1);
    nos.pop();
    posicoes.pop();
  }

  return texto ? { texto, nos, posicoes } : MAPA_VAZIO;
}

const BLOCOS = new Set(["P", "LI", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "TD", "TH", "TR", "BR", "DT", "DD", "BLOCKQUOTE", "SECTION", "ARTICLE", "UL", "OL"]);

function blocoDe(no: Node): Element | null {
  for (let el = no.parentElement; el; el = el.parentElement) {
    if (BLOCOS.has(el.tagName)) return el;
  }
  return null;
}

/** O próximo nó de texto está num bloco diferente do atual? Não avança a caminhada. */
function pertenceABlocoDiferente(atual: Text, caminhada: TreeWalker): boolean {
  const guardado = caminhada.currentNode;
  const proximo = caminhada.nextNode();
  caminhada.currentNode = guardado;
  if (!proximo) return false;
  return blocoDe(atual) !== blocoDe(proximo);
}

/**
 * A palavra que a voz alcançou em `charIndex`: `[início, fim)` em `texto`. Se `charIndex` cair num
 * espaço, vale a próxima palavra. Pontuação colada no fim (vírgula, ponto) não entra no destaque.
 * `null` quando não há palavra ali (índice fora do texto).
 */
export function intervaloDaPalavra(texto: string, charIndex: number): [number, number] | null {
  if (!Number.isInteger(charIndex) || charIndex < 0 || charIndex >= texto.length) return null;

  for (const m of texto.matchAll(/\S+/g)) {
    const inicio = m.index ?? 0;
    const fim = inicio + m[0].length;
    if (charIndex < fim) {
      const limpo = m[0].replace(/[.,;:!?…)"'»]+$/u, "");
      return [inicio, inicio + (limpo.length || m[0].length)];
    }
  }
  return null;
}

/**
 * Divide em frases (`[início, fim)`, sem espaço nas pontas). Quebra depois de `.`, `!`, `?` ou `…`
 * seguidos de espaço ou do fim do texto, então "R$ 1.500,00" e "www.exemplo.com" não são cortados.
 */
export function dividirEmFrases(texto: string): Array<[number, number]> {
  const frases: Array<[number, number]> = [];
  let inicio = 0;

  const fechar = (fim: number) => {
    let i = inicio;
    let f = fim;
    while (i < f && /\s/.test(texto[i])) i++;
    while (f > i && /\s/.test(texto[f - 1])) f--;
    if (f > i) frases.push([i, f]);
    inicio = fim;
  };

  for (const m of texto.matchAll(/[.!?…]+(?=\s|$)/g)) {
    fechar((m.index ?? 0) + m[0].length);
  }
  fechar(texto.length);
  return frases;
}

/** `Range` do trecho `[inicio, fim)` de `texto`, ou `null` se o mapa não cobrir esse trecho. */
export function criarRange(mapa: MapaDeTexto, inicio: number, fim: number): Range | null {
  if (inicio < 0 || fim > mapa.texto.length || fim <= inicio) return null;
  const range = document.createRange();
  range.setStart(mapa.nos[inicio], mapa.posicoes[inicio]);
  range.setEnd(mapa.nos[fim - 1], mapa.posicoes[fim - 1] + 1);
  return range;
}

type RegistroDeDestaques = Map<string, unknown>;
type ConstrutorDeDestaque = new (...ranges: Range[]) => unknown;

function registro(): RegistroDeDestaques | null {
  const css = (typeof CSS !== "undefined" ? CSS : undefined) as unknown as { highlights?: RegistroDeDestaques } | undefined;
  return css?.highlights ?? null;
}

function construtor(): ConstrutorDeDestaque | null {
  const ctor = (globalThis as unknown as { Highlight?: ConstrutorDeDestaque }).Highlight;
  return typeof ctor === "function" ? ctor : null;
}

/** O navegador tem a CSS Custom Highlight API? Sem ela, o destaque por palavra não existe. */
export function suporteDestaque(): boolean {
  return registro() !== null && construtor() !== null;
}

export const DESTAQUE_PALAVRA = "acesso-palavra";
export const DESTAQUE_FRASE = "acesso-frase";

/** Põe `range` no destaque `nome`, trocando o anterior. `null` apaga. */
export function aplicarDestaque(nome: string, range: Range | null): void {
  const destaques = registro();
  const Destaque = construtor();
  if (!destaques || !Destaque) return;

  if (range) destaques.set(nome, new Destaque(range));
  else destaques.delete(nome);
}

export function limparDestaques(): void {
  aplicarDestaque(DESTAQUE_PALAVRA, null);
  aplicarDestaque(DESTAQUE_FRASE, null);
}
