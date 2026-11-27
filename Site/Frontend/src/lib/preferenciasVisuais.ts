import type { PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";
import {
  AJUSTES_PADRAO,
  CONTRASTES,
  LIMITES_VISUAIS,
  ehIdDePadrao,
  type AjustesVisuais,
} from "@/lib/padroesVisuais";

/**
 * A ponte entre as preferências salvas e o motor de padrões: monta os ajustes e confere o que veio
 * do localStorage, que pode ter sido escrito por uma versão antiga ou editado à mão.
 *
 * Havia também a escolha de uma cor para cada papel (sucesso, erro, alerta, informação, destaque),
 * as "cores por significado". Foi retirada: quem a tinha guardada simplesmente deixa de carregá-la, e
 * o padrão e os ajustes seguem valendo como estavam.
 */

const numeroEntre = (v: unknown, min: number, max: number, padrao: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao;

export function ajustesVisuais(p: PreferenciasAcessibilidade): AjustesVisuais {
  return {
    intensidade: p.visualIntensity,
    saturacao: p.visualSaturation,
    brilho: p.visualBrightness,
    contraste: p.visualContrast,
  };
}

/**
 * Confere a parte visual das preferências salvas.
 *
 * Também faz a migração do interruptor antigo: quem tinha "modo para daltonismo" ligado e nunca
 * escolheu um padrão passa a usar o "Padrão acessível", que é o que aquele interruptor fazia. Sem
 * isso, a pessoa abriria o site um dia com as cores da marca de volta, sem ter mexido em nada.
 */
export function normalizarVisual(
  base: PreferenciasAcessibilidade,
  padrao: PreferenciasAcessibilidade,
): Pick<
  PreferenciasAcessibilidade,
  "visualPattern" | "visualIntensity" | "visualSaturation" | "visualBrightness" | "visualContrast" | "colorBlind"
> {
  const escolhido = ehIdDePadrao(base.visualPattern) ? base.visualPattern : padrao.visualPattern;
  const herdado = escolhido === "nenhum" && base.colorBlind === true;

  return {
    visualPattern: herdado ? "acessivel" : escolhido,
    // O interruptor antigo sai de cena depois de virar padrão; a classe que ele ligava continua
    // valendo para qualquer padrão escolhido (ver `AcessibilidadeProvider`).
    colorBlind: herdado ? false : base.colorBlind === true,
    visualIntensity: numeroEntre(
      base.visualIntensity,
      LIMITES_VISUAIS.intensidade.min,
      LIMITES_VISUAIS.intensidade.max,
      padrao.visualIntensity,
    ),
    visualSaturation: numeroEntre(
      base.visualSaturation,
      LIMITES_VISUAIS.saturacao.min,
      LIMITES_VISUAIS.saturacao.max,
      padrao.visualSaturation,
    ),
    visualBrightness: numeroEntre(
      base.visualBrightness,
      LIMITES_VISUAIS.brilho.min,
      LIMITES_VISUAIS.brilho.max,
      padrao.visualBrightness,
    ),
    visualContrast: (CONTRASTES as readonly number[]).includes(base.visualContrast)
      ? base.visualContrast
      : padrao.visualContrast,
  };
}

/** Volta só a personalização visual ao estado inicial, sem tocar nas outras preferências. */
export function visualPadrao(): Pick<
  PreferenciasAcessibilidade,
  "visualPattern" | "visualIntensity" | "visualSaturation" | "visualBrightness" | "visualContrast"
> {
  return {
    visualPattern: "nenhum",
    visualIntensity: AJUSTES_PADRAO.intensidade,
    visualSaturation: AJUSTES_PADRAO.saturacao,
    visualBrightness: AJUSTES_PADRAO.brilho,
    visualContrast: AJUSTES_PADRAO.contraste,
  };
}
