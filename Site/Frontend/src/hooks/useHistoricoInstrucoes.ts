import { useCallback, useSyncExternalStore } from "react";

import {
  CHAVE_HISTORICO,
  EVENTO_DO_HISTORICO,
  lerHistorico,
  limparHistorico,
  removerInstrucao,
  salvarInstrucao,
  type InstrucaoSalva,
} from "@/lib/historicoInstrucoes";

let ultimoBruto: string | null | undefined;
let ultimoValor: InstrucaoSalva[] = [];

/**
 * `useSyncExternalStore` exige a mesma referência enquanto nada mudou: só recalcula a lista quando o
 * texto guardado no `localStorage` muda.
 */
function instantaneo(): InstrucaoSalva[] {
  let bruto: string | null = null;
  try {
    bruto = window.localStorage.getItem(CHAVE_HISTORICO);
  } catch {
    bruto = null;
  }
  if (bruto !== ultimoBruto) {
    ultimoBruto = bruto;
    ultimoValor = lerHistorico();
  }
  return ultimoValor;
}

const VAZIO: InstrucaoSalva[] = [];

function assinar(aviso: () => void) {
  const aoArmazenar = (e: StorageEvent) => {
    if (e.key === null || e.key === CHAVE_HISTORICO) aviso();
  };
  window.addEventListener("storage", aoArmazenar);
  window.addEventListener(EVENTO_DO_HISTORICO, aviso);
  return () => {
    window.removeEventListener("storage", aoArmazenar);
    window.removeEventListener(EVENTO_DO_HISTORICO, aviso);
  };
}

/** O histórico de instruções salvas, sempre atualizado (também entre abas), com as ações para mexer nele. */
export function useHistoricoInstrucoes() {
  const itens = useSyncExternalStore(assinar, instantaneo, () => VAZIO);

  const salvar = useCallback((entrada: { titulo: string; texto: string }) => salvarInstrucao(entrada), []);
  const remover = useCallback((id: string) => removerInstrucao(id), []);
  const limpar = useCallback(() => limparHistorico(), []);

  return { itens, salvar, remover, limpar };
}
