/**
 * Cursor de leitura do leitor de voz do ACESSO: percorre a página bloco a bloco com as setas
 * (`useCursorDeLeitura`), como o cursor virtual de um leitor de tela nativo. Fica ao lado de
 * `leitorSemantico.ts`, que descreve UM elemento; aqui se decide QUAIS elementos são paradas, em que
 * ordem, e quando a seta deve ficar com o componente em vez do cursor.
 *
 * Tudo aqui é função pura sobre o DOM (sem React nem efeitos), para ser testada isoladamente.
 *
 * Uma parada é de dois tipos:
 * - `controle`: botão, link, campo, aba, interruptor... O cursor leva o foco de verdade até ele, e
 *   quem fala é a leitura por foco (`useLeituraAutomatica`), com a mesma frase do Tab. Enter e
 *   Espaço funcionam na hora, porque o elemento está focado.
 * - `texto`: título, parágrafo, item de lista, imagem com `alt`. Não recebe foco; o cursor só o
 *   marca na tela e o lê.
 */

import { descreverElemento, SELETOR_DIALOGO, SELETOR_INTERATIVO } from "@/lib/leitorSemantico";
import { vocabularioPara } from "@/lib/vocabularioDeLeitura";

export type Parada = {
  el: HTMLElement;
  tipo: "controle" | "texto";
  /** O que a voz diz. Nos controles, só é usado quando o foco não consegue chegar neles. */
  fala: string;
  /**
   * Bloco de texto cuja fala é o texto inteiro dele: pode ser lido com destaque palavra por palavra
   * (`useLeituraDestacada`), com `prefixo` falado antes e sem destaque.
   */
  destacavel?: boolean;
  prefixo?: string;
};

/** Blocos de texto que viram parada. Células de tabela entram para as listagens do painel admin. */
export const SELETOR_TEXTO =
  "h1, h2, h3, h4, h5, h6, [role='heading'], p, li, blockquote, figcaption, dt, dd, td, th";

const SELETOR_CANDIDATAS = `${SELETOR_TEXTO}, ${SELETOR_INTERATIVO}, img[alt]`;

/** Partes da página que não entram no cursor: os toasts são lidos sozinhos e o VLibras tem a própria UI. */
const SELETOR_FORA_DO_CURSOR = "[data-sonner-toaster], [vw], [vw-access-button], [vw-plugin-wrapper]";

/**
 * Onde a seta já tem função própria: quem está nestes elementos usa ↑ e ↓ para mexer no componente
 * (trocar a opção, ajustar o valor, percorrer o menu ou as sugestões, subir e descer linhas de um
 * texto), e o cursor de leitura não pode tomá-las.
 *
 * Fora da lista, de propósito:
 * - **Campo de texto de uma linha** (texto, e-mail, senha, busca, telefone, URL): ali a seta só
 *   leva o cursor de texto para o começo ou o fim, e tomá-la evita que quem navega pelas setas fique
 *   preso no campo (o Tab continua igual). Campo com lista de sugestões não se enquadra: é
 *   `combobox`, `aria-autocomplete` ou `list`, e fica com a seta.
 * - **Abas** (`tab`): numa lista horizontal a seta para baixo não faz nada; as verticais são
 *   tratadas à parte.
 */
const SELETOR_SETA_NATIVA = [
  "input[type='number'], input[type='range'], input[type='radio'], input[type='date'], input[type='time']",
  "input[type='datetime-local'], input[type='month'], input[type='week'], input[type='color']",
  "input[list], input[aria-autocomplete], input[aria-haspopup]",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='textbox'], [role='searchbox'], [role='listbox'], [role='option']",
  "[role='menu'], [role='menubar'], [role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio']",
  "[role='radiogroup'], [role='radio'], [role='slider'], [role='spinbutton']",
  "[role='grid'], [role='treegrid'], [role='tree'], [role='treeitem'], [role='scrollbar']",
  "video, audio",
].join(", ");

/**
 * `true` quando ↑ e ↓ pertencem ao componente que está em foco, e o cursor de leitura deve deixar a
 * tecla passar.
 */
export function setaPertenceAoComponente(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.closest(SELETOR_SETA_NATIVA)) return true;

  // `combobox` de campo de texto (estado, cidade, país) usa a seta para percorrer as sugestões.
  // Já o `combobox` que é botão (o seletor do Radix, como o de idioma) só abre com ↓: se o cursor
  // não tomasse a tecla, a pessoa abriria o seletor sem querer e ficaria presa dentro da lista.
  // Aberto, o foco já está na lista (`listbox`), que fica com a seta pelo seletor acima.
  const combobox = alvo.closest<HTMLElement>("[role='combobox']");
  if (combobox && (combobox.tagName === "INPUT" || combobox.getAttribute("aria-expanded") === "true")) return true;

  return alvo.closest("[role='tablist'][aria-orientation='vertical']") !== null;
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\s+/g, " ").trim();
}

/** Para a voz não engasgar com um bloco enorme: corta na última palavra inteira. */
const LIMITE_DA_FALA = 1200;

function limitar(texto: string): string {
  if (texto.length <= LIMITE_DA_FALA) return texto;
  const corte = texto.slice(0, LIMITE_DA_FALA);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${(ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/** Oculto de verdade: o usuário não vê nem um leitor de tela nativo leria. */
export function criarVerificadorDeOculto() {
  const memo = new Map<HTMLElement, boolean>();

  const oculto = (el: HTMLElement): boolean => {
    const guardado = memo.get(el);
    if (guardado !== undefined) return guardado;

    let resultado = false;
    if (el.hidden || el.getAttribute("aria-hidden") === "true" || el.hasAttribute("inert")) {
      resultado = true;
    } else {
      const estilo = window.getComputedStyle(el);
      resultado = estilo.display === "none" || estilo.visibility === "hidden";
    }
    if (!resultado && el.parentElement) resultado = oculto(el.parentElement);

    memo.set(el, resultado);
    return resultado;
  };

  return oculto;
}

/** Texto como o usuário vê. O jsdom não implementa `innerText`, daí o `textContent` de reserva. */
function textoCompleto(el: HTMLElement): string {
  return normalizar(typeof el.innerText === "string" ? el.innerText : el.textContent);
}

/**
 * Texto que é só do bloco: fora dos controles e dos blocos aninhados, que são paradas por conta
 * própria. É o que decide se o bloco merece uma parada ou se seria só uma repetição (um `<li>` que
 * só embrulha um link, um `<h3>` que só embrulha um `<a>`).
 */
function textoProprio(el: HTMLElement, oculto: (e: HTMLElement) => boolean): string {
  let texto = "";
  for (const no of Array.from(el.childNodes)) {
    if (no.nodeType === Node.TEXT_NODE) {
      texto += ` ${no.textContent ?? ""}`;
    } else if (no instanceof HTMLElement) {
      if (no.matches(`${SELETOR_INTERATIVO}, ${SELETOR_TEXTO}, img`) || oculto(no)) continue;
      texto += ` ${textoProprio(no, oculto)}`;
    }
  }
  return normalizar(texto);
}

function nivelDoTitulo(el: HTMLElement): string | null {
  const daTag = /^H([1-6])$/.exec(el.tagName);
  if (daTag) return daTag[1];
  const aria = el.getAttribute("aria-level");
  return aria && /^[1-6]$/.test(aria) ? aria : null;
}

/** O que a voz diz antes do texto de um título ("Título de nível 2: "); vazio para os demais blocos. */
function prefixoDoTitulo(el: HTMLElement): string {
  const ehTitulo = /^H[1-6]$/.test(el.tagName) || el.getAttribute("role") === "heading";
  if (!ehTitulo) return "";
  // "Título de nível 2" no idioma do próprio título (a tela pode estar só em parte traduzida).
  return `${vocabularioPara(el.textContent ?? "", undefined, el).titulo(nivelDoTitulo(el))}: `;
}

function falaDoTexto(el: HTMLElement, texto: string): string {
  const prefixo = prefixoDoTitulo(el);
  const fala = limitar(texto);
  if (!prefixo) return fala;
  // Título que já termina em pontuação não ganha um ponto a mais ("vidas.." soaria como erro).
  const pontuacao = /[.!?…:;]$/.test(fala) ? "" : ".";
  return `${prefixo}${fala}${pontuacao}`;
}

/**
 * Onde o cursor atua. Com um diálogo aberto, só dentro dele: o Radix prende o foco no diálogo, e o
 * que está atrás não pode ser lido nem alcançado. Sem diálogo, a página toda.
 */
export function raizDaLeitura(doc: Document = document): HTMLElement {
  const oculto = criarVerificadorDeOculto();
  const dialogos = Array.from(doc.querySelectorAll<HTMLElement>(SELETOR_DIALOGO)).filter((d) => !oculto(d));
  return dialogos[dialogos.length - 1] ?? doc.body;
}

/** As paradas do cursor dentro de `raiz`, em ordem de leitura (ordem do documento). */
export function listarParadas(raiz: HTMLElement): Parada[] {
  const oculto = criarVerificadorDeOculto();
  const paradas: Parada[] = [];

  for (const el of Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR_CANDIDATAS))) {
    if (el.closest(SELETOR_FORA_DO_CURSOR) || oculto(el)) continue;

    const ehControle = el.matches(SELETOR_INTERATIVO);

    if (ehControle) {
      if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "hidden") continue;
      // Controle dentro de outro controle: vale o de fora (é o que o Tab alcança primeiro).
      if (el.parentElement?.closest(SELETOR_INTERATIVO)) continue;
      const fala = descreverElemento(el);
      if (fala) paradas.push({ el, tipo: "controle", fala });
      continue;
    }

    if (el.tagName === "IMG") {
      // Imagem dentro de um controle é descrita pelo controle (mesma regra de `resolverAlvoFalavel`).
      if (el.closest(SELETOR_INTERATIVO)) continue;
      const fala = descreverElemento(el);
      if (fala) paradas.push({ el, tipo: "texto", fala });
      continue;
    }

    // Bloco de texto. Um título ou parágrafo dentro de um controle (`<a><h3>..</h3></a>`) já é lido
    // pelo controle.
    if (el.closest(SELETOR_INTERATIVO)) continue;
    if (el.closest(".sr-only")) continue;
    if (!textoProprio(el, oculto)) continue;

    const temBlocosAninhados = el.querySelector(SELETOR_TEXTO) !== null;
    // Sem blocos dentro, lê o bloco inteiro (com o texto dos links no meio da frase). Com blocos
    // dentro (um item de lista com sublista), lê só o texto que é dele; o resto vira outras paradas.
    const texto = temBlocosAninhados ? textoProprio(el, oculto) : textoCompleto(el);
    if (texto) {
      paradas.push({
        el,
        tipo: "texto",
        fala: falaDoTexto(el, texto),
        // Com blocos aninhados, a fala é só o texto próprio do bloco, e o destaque por palavra
        // marcaria também o texto dos blocos de dentro.
        destacavel: !temBlocosAninhados,
        prefixo: prefixoDoTitulo(el),
      });
    }
  }

  return paradas;
}

const SEGUINTE = 4; // Node.DOCUMENT_POSITION_FOLLOWING
const ANTERIOR = 2; // Node.DOCUMENT_POSITION_PRECEDING

/**
 * A parada seguinte (`direcao` 1) ou anterior (-1) a `referencia`, ou `null` no fim ou no começo.
 *
 * Sem referência (nada foi lido nem focado ainda), começa pela primeira parada que aparece na tela,
 * para quem rolou a página não voltar ao topo. Os descendentes de um bloco vêm depois dele
 * (parágrafo, depois o link que está dentro), e o contrário na volta.
 */
export function acharParada(paradas: Parada[], referencia: HTMLElement | null, direcao: 1 | -1): Parada | null {
  if (paradas.length === 0) return null;

  if (!referencia) {
    return paradas.find((p) => p.el.getBoundingClientRect().bottom > 0) ?? paradas[0];
  }

  if (direcao === 1) {
    return paradas.find((p) => p.el !== referencia && (referencia.compareDocumentPosition(p.el) & SEGUINTE) !== 0) ?? null;
  }

  for (let i = paradas.length - 1; i >= 0; i--) {
    const p = paradas[i];
    if (p.el !== referencia && (referencia.compareDocumentPosition(p.el) & ANTERIOR) !== 0) return p;
  }
  return null;
}
