/**
 * Proteção contra acionamentos repetidos (mãos com tremor, cliques duplos sem querer, envio duplicado).
 *
 * A regra é estreita de propósito, para não atrapalhar quem usa o site do jeito normal:
 *  - só vale para o MESMO controle, repetido dentro do intervalo; outro controle nunca é afetado;
 *  - a janela conta a partir do último acionamento ACEITO, então o terceiro clique, depois da janela,
 *    passa normalmente (um clique ignorado não "renova" o bloqueio);
 *  - campos de texto, seletores e controles deslizantes não entram (digitar e arrastar são repetição legítima);
 *  - quem precisa de repetição rápida (botões de + e −, por exemplo) marca `data-permite-repeticao`.
 *
 * Funções puras, para testar sem navegador.
 */

export const INTERVALO_DE_ENVIO_MS = 500;

/** O que conta como controle acionável por clique. */
const SELETOR_ACIONAVEL = [
  "button",
  "a[href]",
  "summary",
  '[role="button"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  'input[type="submit"]',
  'input[type="button"]',
  'input[type="reset"]',
  'input[type="image"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
].join(",");

/** O controle acionável que recebeu o clique, ou `null` se o clique foi em outra coisa (ou deve ficar de fora). */
export function controleAcionado(alvo: EventTarget | null): Element | null {
  if (!(alvo instanceof Element)) return null;

  const controle = alvo.closest(SELETOR_ACIONAVEL);
  if (!controle) return null;

  if (controle.closest("[data-permite-repeticao], [data-varredura-ignorar]")) return null;
  if (controle.hasAttribute("disabled") || controle.getAttribute("aria-disabled") === "true") return null;

  return controle;
}

export type RegistroDeAcionamento = { controle: Element | null; instante: number };

export const REGISTRO_VAZIO: RegistroDeAcionamento = { controle: null, instante: Number.NEGATIVE_INFINITY };

/**
 * Decide se este acionamento deve ser ignorado. Devolve também o novo registro: só um acionamento
 * ACEITO atualiza o registro.
 */
export function avaliarAcionamento(registro: RegistroDeAcionamento, controle: Element, agora: number, intervaloMs: number): { ignorar: boolean; registro: RegistroDeAcionamento } {
  const repetido = registro.controle === controle && agora - registro.instante < intervaloMs;

  if (repetido) return { ignorar: true, registro };

  return { ignorar: false, registro: { controle, instante: agora } };
}

/** Mesma regra para o envio de formulários: o mesmo formulário duas vezes dentro do intervalo. */
export function avaliarEnvio(registro: RegistroDeAcionamento, formulario: Element, agora: number, intervaloMs: number = INTERVALO_DE_ENVIO_MS) {
  return avaliarAcionamento(registro, formulario, agora, intervaloMs);
}
