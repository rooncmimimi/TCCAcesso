import type {
  PreferenciasAcessibilidade,
  EscalaFonte,
  EspacamentoLetras,
  EscalaAlturaLinha,
} from "../acessibilidade/types";
import { FAMILIA_FONTE_MARCA_POR_VARIANTE } from "./fonteMarca";
import { coresEscurasAltoContraste, coresClarasAltoContraste } from "./cores";
import { FAMILIA_FONTE_DISLEXIA_POR_PESO } from "./fonteDislexia";
import { temas, type Tema, type ModoTema } from "./temas";
import { tipografia as tipografiaBase, type TokenTipografia, type VarianteTipografia } from "./tipografia";

/**
 * Multiplicador de `fontSize` e `lineHeight`. `small` também é uma preferência válida, para quem
 * prefere uma interface compacta. A faixa é contida (0,9 a 1,3) para não quebrar o layout: botões
 * mantêm `minHeight` fixo, e ícones e espaçamentos não mudam de tamanho.
 */
const MULTIPLICADOR_ESCALA_FONTE: Record<EscalaFonte, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  extraLarge: 1.3,
};

/**
 * Fração do `fontSize` (não um valor fixo em px: um espaçamento de letra
 * fixo ficaria minúsculo num título e enorme numa legenda). `wide` usa
 * 0.12, a própria referência do WCAG 2.2, critério 1.4.12 (Text Spacing):
 * espaçamento de letra de até 0.12× o tamanho da fonte precisa continuar
 * legível.
 */
const FATOR_ESPACAMENTO_LETRAS: Record<EspacamentoLetras, number> = {
  normal: 0,
  comfortable: 0.06,
  wide: 0.12,
};

/** Multiplica o `lineHeight` já escalado por `fontScale`: os dois ajustes se somam. */
const MULTIPLICADOR_ALTURA_LINHA: Record<EscalaAlturaLinha, number> = {
  normal: 1,
  relaxed: 1.15,
  loose: 1.3,
};

/**
 * `fonteDislexiaAtiva` já chega calculada (preferência ligada e fonte carregada, ver
 * `montarTemaAcessivel`), como `reduzirAnimacoesEfetivo`: a regra fica num único lugar e esta
 * função só aplica o resultado.
 */
function escalarTipografia(
  preferencias: PreferenciasAcessibilidade,
  fonteDislexiaAtiva: boolean,
  fonteMarcaCarregada: boolean,
): Record<VarianteTipografia, TokenTipografia> {
  const fatorFonte = MULTIPLICADOR_ESCALA_FONTE[preferencias.fontScale];
  const fatorLetras = FATOR_ESPACAMENTO_LETRAS[preferencias.letterSpacing];
  const fatorLinha = MULTIPLICADOR_ALTURA_LINHA[preferencias.lineHeightScale];

  const resultado = {} as Record<VarianteTipografia, TokenTipografia>;

  for (const chave of Object.keys(tipografiaBase) as VarianteTipografia[]) {
    const token = tipografiaBase[chave];
    const fontSize = Math.round(token.fontSize! * fatorFonte);
    const lineHeight = Math.round(token.lineHeight! * fatorFonte * fatorLinha);
    const letterSpacing = Math.round(fontSize * fatorLetras * 10) / 10;
    // Prioridade: fonte para dislexia, depois a da marca, depois a padrão da plataforma. Enquanto
    // os arquivos não carregam (primeiros instantes do app) ou o peso não está mapeado, fica sem
    // `fontFamily` e usa a fonte padrão; o React renderiza de novo quando o `useFonts()` termina.
    const fontFamily = fonteDislexiaAtiva
      ? FAMILIA_FONTE_DISLEXIA_POR_PESO[String(token.fontWeight)]
      : fonteMarcaCarregada
        ? FAMILIA_FONTE_MARCA_POR_VARIANTE[chave]
        : undefined;

    resultado[chave] = { ...token, fontSize, lineHeight, letterSpacing, ...(fontFamily ? { fontFamily } : {}) };
  }

  return resultado;
}

/**
 * Ponto único onde as preferências de acessibilidade viram o tema consumido pelos componentes; só o
 * `TemaProvider` chama esta função.
 *
 * `reduzirAnimacoesEfetivo` chega já calculado pelo `AcessibilidadeProvider`, dono dessa regra. As
 * fontes têm padrão `false` para chamadas com três argumentos, como nos testes; o `TemaProvider`
 * sempre passa o valor real de `useFonts()`.
 */
export function montarTemaAcessivel(
  modo: ModoTema,
  preferencias: PreferenciasAcessibilidade,
  reduzirAnimacoesEfetivo: boolean,
  fonteDislexiaCarregada = false,
  fonteMarcaCarregada = false,
): Tema {
  const base = temas[modo];

  const cores = preferencias.highContrast
    ? modo === "dark"
      ? coresEscurasAltoContraste
      : coresClarasAltoContraste
    : base.colors;

  const fonteDislexiaAtiva = preferencias.dyslexiaFont && fonteDislexiaCarregada;

  return {
    ...base,
    colors: cores,
    typography: escalarTipografia(preferencias, fonteDislexiaAtiva, fonteMarcaCarregada),
    a11y: {
      highContrast: preferencias.highContrast,
      reduceMotion: reduzirAnimacoesEfetivo,
      enhancedFocus: preferencias.enhancedFocus,
      focusRingWidth: preferencias.enhancedFocus ? 4 : 2,
    },
  };
}
