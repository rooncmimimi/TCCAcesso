/**
 * Verificação automática de acessibilidade com o `axe-core` (dependência só de desenvolvimento), para
 * os testes. Roda no jsdom, que NÃO tem layout: por isso ficam desligadas as regras que dependem de
 * tamanho, posição e cor reais (contraste de cor, tamanho do alvo, regiões roláveis e a regra de
 * "tudo dentro de marcos", que só faz sentido na página inteira). Essas se conferem no navegador de
 * verdade (ver `docs/acessibilidade-avancada-verificacoes.md`).
 *
 * O axe acha só uma parte dos problemas (a própria documentação fala em cerca de 30% a 57%): passar
 * aqui NÃO significa que o recurso é acessível, e não substitui o teste com leitor de tela e pessoas.
 */

import axe, { type Result, type RunOptions } from "axe-core";

const REGRAS_QUE_PRECISAM_DE_LAYOUT = ["color-contrast", "target-size", "scrollable-region-focusable", "region", "landmark-one-main", "page-has-heading-one"];

export type Violacao = { regra: string; impacto: string | null | undefined; ajuda: string; elementos: string[] };

const resumir = (r: Result): Violacao => ({
  regra: r.id,
  impacto: r.impact,
  ajuda: r.help,
  elementos: r.nodes.map((n) => n.target.join(" ")).slice(0, 5),
});

/**
 * Violações de acessibilidade encontradas em `raiz`. Lista vazia = o axe não achou nada (dentro do que
 * ele consegue achar). Cada violação traz a regra, o impacto, a explicação e até 5 elementos.
 */
export async function violacoesDeAcessibilidade(raiz: Element = document.body, opcoes: RunOptions = {}): Promise<Violacao[]> {
  const regras = Object.fromEntries(REGRAS_QUE_PRECISAM_DE_LAYOUT.map((id) => [id, { enabled: false }]));
  const resultado = await axe.run(raiz, { ...opcoes, rules: { ...regras, ...(opcoes.rules ?? {}) } });

  return resultado.violations.map(resumir);
}
