import type { CodigoIdioma } from "./idiomas";

export type Variaveis = Record<string, string | number>;

/**
 * Procura a chave no dicionário e preenche as variáveis (`{nome}`).
 *
 * Plural: quando `vars.n` é número e o dicionário tem `chave_um` (e `chave_outros`), 1 usa `chave_um` e qualquer outro número usa
 * `chave_outros` (ou a própria `chave`). Chave que não existe devolve a própria chave: aparece
 * errada na tela e nos testes, em vez de sumir.
 */
export function traduzir(dicionario: Readonly<Record<string, string>>, _idioma: CodigoIdioma, chave: string, vars?: Variaveis): string {
  let texto: string | undefined;

  if (typeof vars?.n === "number") {
    // Em português, inglês e espanhol só o 1 é singular: 0 é "0 curtidas", "0 likes", "0 me gusta".
    const categoria = vars.n === 1 ? "um" : "outros";
    texto = dicionario[`${chave}_${categoria}`];
  }

  texto ??= dicionario[chave];

  if (texto === undefined) return chave;

  if (!vars) return texto;

  return texto.replace(/\{(\w+)\}/g, (marca, nome: string) => (nome in vars ? String(vars[nome]) : marca));
}
