/**
 * Cores do ACESSO. Nenhum outro arquivo deve escrever um hex diretamente —
 * sempre importar daqui.
 *
 * Os quatro valores de `brand` são a identidade oficial da marca e nunca
 * mudam entre temas. As paletas `light`/`dark` abaixo são a referência
 * conceitual da identidade do site (Site/Frontend/src/styles/globals.css),
 * reconstruída como valores próprios do app — não são CSS convertido, e os
 * neutros/variantes de escuro foram recalculados a partir dos mesmos tons
 * `oklch` que o site usa (não é uma inversão automática).
 */
export const brand = {
  green: "#21A848",
  red: "#EB1B25",
  yellow: "#FAD905",
  blue: "#0A98E7",
} as const;

/**
 * Uma cor semântica sempre vem em 4 partes: `solid` (preenchimento — botão,
 * badge sólido), `onSolid` (texto/ícone sobre o `solid`), `soft` (fundo
 * sutil, para alertas/badges discretos) e `onSoft` (texto/ícone sobre o
 * `soft`). Isso existe porque nem toda cor de marca se comporta igual como
 * texto: o amarelo (`#FAD905`) é claro demais para texto branco em cima, e
 * mesmo escuro, tem contraste ruim como cor de TEXTO — por isso `onSolid`
 * do warning é sempre um tom quase preto, nunca branco, e é o único caso
 * que precisou de um `onSoft` deliberadamente diferente de `textPrimary`.
 */
type SemanticColorSet = {
  solid: string;
  onSolid: string;
  soft: string;
  onSoft: string;
};

type ColorTokens = {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  disabled: string;
  disabledText: string;

  /** Cor de ação principal (CTA, item ativo). Separada de `success` de
   * propósito: hoje as duas usam o mesmo verde, mas representam conceitos
   * diferentes (ação vs. resultado positivo) e podem divergir no futuro
   * sem quebrar nenhum componente que já usa o token certo. */
  primary: SemanticColorSet;
  success: SemanticColorSet;
  warning: SemanticColorSet;
  error: SemanticColorSet;
  info: SemanticColorSet;

  /** Cor do anel de foco visível (teclado físico, D-pad, switch access —
   * Fase 5). Hoje igual a `info.solid` em cada tema, mas é um token
   * próprio (não um alias) para poder divergir no futuro sem tocar em
   * nenhum componente — mesma lógica de `primary` vs. `success` acima. */
  focus: string;
};

export const lightColors: ColorTokens = {
  background: "#F8FAFD",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  textPrimary: "#101926",
  textSecondary: "#3A4657",
  textMuted: "#596475",
  // Fase 7: era #DDE2E8 (contraste de só 1.30:1 contra branco — bem abaixo
  // do 3:1 que o WCAG 1.4.11 pede para a borda ser a ÚNICA pista visual de
  // onde um Input termina, já que Input e Card têm o mesmo fundo branco).
  // #7E8A99 mede 3.51:1 (calculado, não estimado).
  border: "#7E8A99",
  divider: "#E7EBF0",
  disabled: "#E4E7EC",
  disabledText: "#9AA3B0",

  // Fase 7: onSoft era #178035 (4.30:1 contra o soft #DCF3E2 — abaixo do
  // 4.5:1 que o WCAG pede para texto normal). #146B2C mede 5.67:1.
  primary: { solid: brand.green, onSolid: "#FFFFFF", soft: "#DCF3E2", onSoft: "#146B2C" },
  success: { solid: brand.green, onSolid: "#FFFFFF", soft: "#DCF3E2", onSoft: "#146B2C" },
  warning: { solid: brand.yellow, onSolid: "#050407", soft: "#FFF6D6", onSoft: "#6B4A00" },
  error: { solid: brand.red, onSolid: "#FFFFFF", soft: "#FCE4E5", onSoft: "#B3121A" },
  info: { solid: brand.blue, onSolid: "#FFFFFF", soft: "#E3F3FC", onSoft: "#05628F" },
  focus: brand.blue,
};

export const darkColors: ColorTokens = {
  background: "#0F141D",
  surface: "#171E2A",
  surfaceElevated: "#1E2733",
  textPrimary: "#F3F5F8",
  textSecondary: "#C7CED8",
  textMuted: "#A6AFBB",
  // Fase 7: era #232C3A (1.19:1 contra a surface — mesmo problema do tema
  // claro). #647388 mede 3.46:1 contra a surface (e 3.82:1 contra o
  // background, ainda mais folgado).
  border: "#647388",
  divider: "#232C3A",
  disabled: "#232C3A",
  disabledText: "#5B6472",

  // Verde mais claro que o da marca (não o mesmo #21A848) — mesma técnica
  // do site: em fundo escuro, a cor de ação precisa ficar mais luminosa
  // pra manter contraste, e o texto sobre ela vira escuro, não branco.
  primary: { solid: "#44C160", onSolid: "#0B2A16", soft: "#173B24", onSoft: "#86E6A6" },
  success: { solid: "#44C160", onSolid: "#0B2A16", soft: "#173B24", onSoft: "#86E6A6" },
  // Amarelo continua o MESMO tom em ambos os temas (o site faz igual) — já
  // é claro o bastante pra se destacar num fundo escuro sem precisar mudar.
  warning: { solid: brand.yellow, onSolid: "#050407", soft: "#3A2E00", onSoft: "#F5E9B8" },
  // Vermelho também não muda entre temas — já tem saturação suficiente
  // pra funcionar em fundo claro ou escuro sem precisar de um tom à parte.
  error: { solid: brand.red, onSolid: "#FFFFFF", soft: "#3A1418", onSoft: "#F5A8AC" },
  info: { solid: "#53C7FF", onSolid: "#062033", soft: "#0F2E40", onSoft: "#8FDBFF" },
  focus: "#53C7FF",
};

/**
 * Paletas de alto contraste (Fase 5) — não são um terceiro `ThemeMode`, são
 * uma variação de `light`/`dark` (ver `theme/accessibleTheme.ts` e
 * `src/accessibility/README.md`). Fundo e texto vão para os extremos
 * (preto/branco puros) e as quatro cores de marca usam tons mais escuros
 * (light) ou mais claros (dark) que os tons "soltos" normais, escolhidos
 * para bater pelo menos WCAG AAA (≥7:1) contra o fundo em que aparecem —
 * verificado com uma calculadora de contraste relativo (fórmula do WCAG
 * 2.x), não estimado a olho. `warning` já não precisou mudar: amarelo puro
 * com texto preto já passa de 14:1 nos dois temas.
 */
export const lightHighContrastColors: ColorTokens = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#F2F2F2",
  textPrimary: "#000000",
  textSecondary: "#262626",
  textMuted: "#3B3B3B",
  border: "#000000",
  divider: "#000000",
  disabled: "#D9D9D9",
  disabledText: "#595959",

  primary: { solid: "#0A5C1A", onSolid: "#FFFFFF", soft: "#E4F5E8", onSoft: "#0A5C1A" },
  success: { solid: "#0A5C1A", onSolid: "#FFFFFF", soft: "#E4F5E8", onSoft: "#0A5C1A" },
  warning: { solid: brand.yellow, onSolid: "#000000", soft: "#FFF1B8", onSoft: "#4A3100" },
  error: { solid: "#A3121A", onSolid: "#FFFFFF", soft: "#FCE4E5", onSoft: "#8F0F16" },
  info: { solid: "#075591", onSolid: "#FFFFFF", soft: "#DCEEFC", onSoft: "#064577" },
  focus: "#075591",
};

export const darkHighContrastColors: ColorTokens = {
  background: "#000000",
  surface: "#0D0D0D",
  surfaceElevated: "#1A1A1A",
  textPrimary: "#FFFFFF",
  textSecondary: "#F2F2F2",
  textMuted: "#D8D8D8",
  border: "#FFFFFF",
  divider: "#CCCCCC",
  disabled: "#262626",
  disabledText: "#8C8C8C",

  primary: { solid: "#4ADE80", onSolid: "#000000", soft: "#0F2416", onSoft: "#4ADE80" },
  success: { solid: "#4ADE80", onSolid: "#000000", soft: "#0F2416", onSoft: "#4ADE80" },
  warning: { solid: brand.yellow, onSolid: "#000000", soft: "#3A2E00", onSoft: "#F5E9B8" },
  error: { solid: "#FF8A8F", onSolid: "#000000", soft: "#2B0C0E", onSoft: "#FF8A8F" },
  info: { solid: "#7FCBFF", onSolid: "#000000", soft: "#0A2740", onSoft: "#7FCBFF" },
  focus: "#7FCBFF",
};
