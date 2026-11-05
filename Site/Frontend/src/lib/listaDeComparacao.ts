/**
 * Lista das vagas que a pessoa escolheu comparar (no máximo LIMITE_DE_VAGAS). Guardada só no
 * navegador, na sessão (sessionStorage): nada vai para o servidor e a lista some ao fechar a aba.
 * Todas as leituras e gravações toleram o armazenamento indisponível (janela privada, bloqueio).
 */

import { LIMITE_DE_VAGAS } from "@/lib/comparadorDeVagas";

export const CHAVE_DA_COMPARACAO = "acesso:comparar-vagas";

const EVENTO = "acesso:comparacao-mudou";

export function lerComparacao(): string[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE_DA_COMPARACAO);
    const lista: unknown = bruto ? JSON.parse(bruto) : [];

    if (!Array.isArray(lista)) return [];

    return [...new Set(lista.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, LIMITE_DE_VAGAS);
  } catch {
    return [];
  }
}

function gravar(lista: string[]) {
  try {
    sessionStorage.setItem(CHAVE_DA_COMPARACAO, JSON.stringify(lista));
  } catch {
    // sem armazenamento: a lista simplesmente não persiste
  }

  window.dispatchEvent(new Event(EVENTO));
}

export type ResultadoDeAdicionar = "adicionada" | "ja-estava" | "lista-cheia";

export function adicionarNaComparacao(id: string): ResultadoDeAdicionar {
  const atual = lerComparacao();

  if (atual.includes(id)) return "ja-estava";
  if (atual.length >= LIMITE_DE_VAGAS) return "lista-cheia";

  gravar([...atual, id]);

  return "adicionada";
}

export function removerDaComparacao(id: string) {
  gravar(lerComparacao().filter((v) => v !== id));
}

export function limparComparacao() {
  gravar([]);
}

/** Para `useSyncExternalStore`. */
export function assinarComparacao(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);

  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

/** Texto estável (string) da lista atual, para `useSyncExternalStore` comparar por valor. */
export const fotoDaComparacao = () => lerComparacao().join(",");
