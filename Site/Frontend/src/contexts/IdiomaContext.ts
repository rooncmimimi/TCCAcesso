import { createContext } from "react";

import { DICIONARIOS, type ChaveBase } from "@/i18n/dicionarios";
import { IDIOMA_PADRAO, localeDe, type CodigoIdioma } from "@/i18n/idiomas";
import { traduzir, type Variaveis } from "@/i18n/traduzir";

export type TFuncao = (chave: ChaveBase, vars?: Variaveis) => string;

export type IdiomaContextValue = {
  idioma: CodigoIdioma;
  /** O locale BCP 47 ("pt-BR"), para `Intl` e para o atributo `lang`. */
  locale: string;
  /** Troca o idioma do site, guarda no aparelho e, com sessão, na conta. */
  trocar: (novo: CodigoIdioma) => void;
  t: TFuncao;
  /** O idioma está salvo na conta (e não só neste aparelho)? Só é verdade com sessão e o recurso ligado no servidor. */
  salvoNaConta: boolean;
};

export function criarT(idioma: CodigoIdioma): TFuncao {
  return (chave, vars) => traduzir(DICIONARIOS[idioma], idioma, chave, vars);
}

/**
 * Sem provedor (testes de componente, ou uma árvore montada sem ele), o site fica em português e `trocar` não faz nada:
 * os componentes continuam renderizando sem precisar de uma casca.
 */
export const IdiomaContext = createContext<IdiomaContextValue>({
  idioma: IDIOMA_PADRAO,
  locale: localeDe(IDIOMA_PADRAO),
  trocar: () => undefined,
  t: criarT(IDIOMA_PADRAO),
  salvoNaConta: false,
});
