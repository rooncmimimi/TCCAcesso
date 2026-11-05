import { PREFERENCIAS_PADRAO, type PreferenciasAcessibilidade } from "@/contexts/AcessibilidadeContext";

/** Limites das preferências do Bloco 4. Valores salvos fora deles (ou de outro tipo) voltam ao padrão. */
export const LIMITES = {
  scanSpeed: { min: 0.6, max: 5, passo: 0.1 },
  tremorDelay: { min: 300, max: 2000, passo: 100 },
} as const;

/** Nome da tecla para mostrar: Espaço, F8, Z. */
export const nomeDaTecla = (tecla: string) => (tecla === " " ? "Espaço" : tecla.length === 1 ? tecla.toUpperCase() : tecla);

export const TAMANHOS_DE_ALVO = ["padrao", "grande", "maior"] as const;

const numeroEntre = (v: unknown, min: number, max: number, padrao: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao);

/**
 * Lê as preferências salvas no navegador sem confiar nelas: o que está no localStorage pode ter sido
 * escrito por uma versão antiga, editado à mão ou corrompido. Cada preferência motora é conferida
 * (tipo e faixa); o resto segue como já era (mescla com o padrão).
 */
export function normalizarPreferencias(salvas: Partial<PreferenciasAcessibilidade> | null | undefined): PreferenciasAcessibilidade {
  const base = { ...PREFERENCIAS_PADRAO, ...(salvas ?? {}) };
  const padrao = PREFERENCIAS_PADRAO;

  return {
    ...base,
    scanning: typeof base.scanning === "boolean" ? base.scanning : padrao.scanning,
    scanSpeed: numeroEntre(base.scanSpeed, LIMITES.scanSpeed.min, LIMITES.scanSpeed.max, padrao.scanSpeed),
    scanKey: typeof base.scanKey === "string" && base.scanKey.length <= 20 ? base.scanKey : padrao.scanKey,
    scanGroups: typeof base.scanGroups === "boolean" ? base.scanGroups : padrao.scanGroups,
    tremorGuard: typeof base.tremorGuard === "boolean" ? base.tremorGuard : padrao.tremorGuard,
    tremorDelay: numeroEntre(base.tremorDelay, LIMITES.tremorDelay.min, LIMITES.tremorDelay.max, padrao.tremorDelay),
    targetSize: (TAMANHOS_DE_ALVO as readonly string[]).includes(base.targetSize) ? base.targetSize : padrao.targetSize,
    shortcuts: typeof base.shortcuts === "boolean" ? base.shortcuts : padrao.shortcuts,
  };
}
