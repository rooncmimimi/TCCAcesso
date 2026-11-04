/**
 * "Onde estou?": reúne, do que está na tela agora, a página, a seção, a etapa do cadastro e a ação
 * principal. Tudo vem do próprio DOM (títulos, `aria-current`, botão de envio), nada é suposto, e o
 * que não for encontrado fica de fora em vez de ser inventado.
 *
 * A "ação principal" é uma heurística e é apresentada assim: o botão de envio do formulário, ou o
 * elemento que a página marcou com `data-acao-principal`. Páginas sem nenhum dos dois não ganham uma
 * "próxima ação".
 */

import { descreverElemento } from "@/lib/leitorSemantico";
import { criarVerificadorDeOculto } from "@/lib/cursorDeLeitura";

export type OndeEstou = {
  pagina: string | null;
  secao: string | null;
  etapa: string | null;
  acao: string | null;
};

const SELETOR_TITULO_DA_SECAO = "h2, h3, h4";
const ETAPA = /^(?:Etapa|Step|Paso)\s+\d+\s+(?:de|of)\s+\d+/i;

function texto(el: Element | null | undefined): string | null {
  const bruto = (el as HTMLElement | null | undefined)?.innerText ?? el?.textContent;
  const limpo = bruto?.replace(/\s+/g, " ").trim();
  return limpo || null;
}

function principal(doc: Document): HTMLElement {
  return (doc.querySelector("main") as HTMLElement | null) ?? doc.body;
}

/** O nome da página: o `h1` do conteúdo e, sem ele, o título da aba sem o sufixo " — ACESSO". */
export function nomeDaPagina(doc: Document = document): string | null {
  const h1 = texto(principal(doc).querySelector("h1"));
  if (h1) return h1;
  const titulo = doc.title.replace(/\s*[—–-]\s*ACESSO\s*$/i, "").trim();
  return titulo || null;
}

/**
 * A seção em que a pessoa está: o último título (h2 a h4) que começa antes do ponto de referência.
 * O ponto é o elemento em foco, se estiver no conteúdo; senão, o terço de cima da janela. Sem nenhum
 * título antes do ponto, devolve `null`.
 */
export function secaoAtual(doc: Document = document): string | null {
  const raiz = principal(doc);
  const oculto = criarVerificadorDeOculto();
  const titulos = Array.from(raiz.querySelectorAll<HTMLElement>(SELETOR_TITULO_DA_SECAO)).filter((t) => !oculto(t) && texto(t));
  if (titulos.length === 0) return null;

  const focado = doc.activeElement;
  if (focado instanceof HTMLElement && focado !== doc.body && raiz.contains(focado)) {
    // Os títulos que vêm antes do foco, na ordem do documento (o foco dentro de um título conta).
    const antes = titulos.filter((t) => t === focado || t.contains(focado) || (t.compareDocumentPosition(focado) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    return texto(antes[antes.length - 1]);
  }

  const limite = (doc.defaultView?.innerHeight ?? 800) / 3;
  const acima = titulos.filter((t) => t.getBoundingClientRect().top <= limite);
  return texto(acima[acima.length - 1]);
}

/** "Etapa 2 de 5 — Dados pessoais", do indicador do cadastro, ou `null` fora do cadastro. */
export function etapaDoCadastro(doc: Document = document): string | null {
  for (const p of Array.from(doc.querySelectorAll('p[aria-live="polite"]'))) {
    const t = texto(p);
    if (t && ETAPA.test(t)) return t;
  }
  return null;
}

/** O que a página oferece como ação principal, se oferecer: `data-acao-principal` ou o envio do formulário. */
export function acaoPrincipal(doc: Document = document): string | null {
  const raiz = principal(doc);
  const oculto = criarVerificadorDeOculto();

  const marcado = Array.from(raiz.querySelectorAll<HTMLElement>("[data-acao-principal]")).find((el) => !oculto(el));
  const envio = Array.from(raiz.querySelectorAll<HTMLButtonElement>('button[type="submit"]')).find((el) => !oculto(el) && !el.disabled);
  const alvo = marcado ?? envio;
  if (!alvo) return null;

  const descricao = descreverElemento(alvo);
  return descricao ? descricao.replace(/\.+$/, "") : null;
}

export function coletarOndeEstou(doc: Document = document): OndeEstou {
  return { pagina: nomeDaPagina(doc), secao: secaoAtual(doc), etapa: etapaDoCadastro(doc), acao: acaoPrincipal(doc) };
}

/** As partes que foram encontradas, em frases curtas, na ordem: página, etapa, seção, ação. */
/** Fecha a frase com ponto, sem repetir a pontuação que o texto já traz ("vidas." não vira "vidas.."). */
function fechar(frase: string): string {
  return /[.!?…]$/.test(frase) ? frase : `${frase}.`;
}

/** As partes que foram encontradas, em frases curtas, na ordem: página, etapa, seção, ação. */
export function frasesDeOndeEstou(info: OndeEstou): string[] {
  const frases: string[] = [];
  if (info.pagina) frases.push(fechar(`Você está na página: ${info.pagina}`));
  if (info.etapa) frases.push(fechar(info.etapa));
  if (info.secao && info.secao !== info.pagina) frases.push(fechar(`Seção atual: ${info.secao}`));
  if (info.acao) frases.push(fechar(`Ação principal desta tela: ${info.acao}`));
  return frases;
}
