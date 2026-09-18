import { marca, coresEscuras, coresClaras } from "./cores";
import { raios } from "./raios";
import { sombra } from "./sombras";
import { tamanhos } from "./tamanhos";
import { espacamentos } from "./espacamentos";
import { tipografia, type TokenTipografia, type VarianteTipografia } from "./tipografia";

/**
 * Só existem dois modos, claro e escuro. Alto contraste é um ajuste sobre o modo ativo, como no
 * Android, e a troca de paleta acontece em `tema/temaAcessivel.ts`; `temas.light` e `temas.dark`
 * são os temas sem ajuste. Nenhum componente precisa saber disso, porque todos leem cores por
 * token. Ver `src/acessibilidade/README.md`.
 */
export type ModoTema = "light" | "dark";

/**
 * Valores de acessibilidade que os componentes leem direto em `tema.a11y`, sem chamar
 * `useAcessibilidade()`, como já fazem com `tema.colors`. `montarTema()` preenche valores neutros;
 * as preferências são aplicadas por `montarTemaAcessivel()`.
 */
export type TokensAcessibilidadeTema = {
  highContrast: boolean;
  /** Já é o valor efetivo (preferência do usuário ou sinal do sistema), nunca a preferência bruta sozinha. */
  reduceMotion: boolean;
  enhancedFocus: boolean;
  /** Espessura do anel de foco visível em px: 2 normal, 4 com `enhancedFocus`. */
  focusRingWidth: number;
};

export type Tema = {
  mode: ModoTema;
  colors: typeof coresClaras;
  brand: typeof marca;
  /**
   * `Record` genérico em vez de `typeof tipografia`: o objeto base é literal, mas `tema.typography`
   * é sempre recalculado por `montarTemaAcessivel()` com as escalas de texto, então o tipo precisa
   * aceitar qualquer valor no formato de `TokenTipografia`.
   */
  typography: Record<VarianteTipografia, TokenTipografia>;
  spacing: typeof espacamentos;
  radius: typeof raios;
  sizes: typeof tamanhos;
  shadow: typeof sombra;
  a11y: TokensAcessibilidadeTema;
};

function montarTema(modo: ModoTema): Tema {
  return {
    mode: modo,
    colors: modo === "dark" ? coresEscuras : coresClaras,
    brand: marca,
    typography: tipografia,
    spacing: espacamentos,
    radius: raios,
    sizes: tamanhos,
    shadow: sombra,
    a11y: { highContrast: false, reduceMotion: false, enhancedFocus: false, focusRingWidth: 2 },
  };
}

export const temas: Record<ModoTema, Tema> = {
  light: montarTema("light"),
  dark: montarTema("dark"),
};
