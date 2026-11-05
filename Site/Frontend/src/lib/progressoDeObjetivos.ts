import type { Objetivo } from "@/dados/objetivos";

/**
 * Quais passos de cada objetivo a pessoa já marcou como feitos. Fica só neste navegador
 * (localStorage), é só uma ajuda para não se perder: nada disso é enviado nem muda nada na conta.
 */

export const CHAVE_DOS_OBJETIVOS = "acesso:objetivos-feitos";

export type Progresso = Record<string, string[]>;

export function lerProgresso(): Progresso {
  try {
    const bruto = window.localStorage.getItem(CHAVE_DOS_OBJETIVOS);
    const dado: unknown = bruto ? JSON.parse(bruto) : {};

    if (!dado || typeof dado !== "object" || Array.isArray(dado)) return {};

    const limpo: Progresso = {};

    for (const [objetivo, passos] of Object.entries(dado as Record<string, unknown>)) {
      if (Array.isArray(passos)) limpo[objetivo] = passos.filter((p): p is string => typeof p === "string");
    }

    return limpo;
  } catch {
    return {};
  }
}

function gravar(progresso: Progresso) {
  try {
    window.localStorage.setItem(CHAVE_DOS_OBJETIVOS, JSON.stringify(progresso));
  } catch {
    // Sem armazenamento, a marcação vale só enquanto a página está aberta.
  }
}

/** Marca ou desmarca um passo e devolve o novo progresso. */
export function alternarPasso(progresso: Progresso, objetivoId: string, passoId: string): Progresso {
  const atuais = progresso[objetivoId] ?? [];
  const novos = atuais.includes(passoId) ? atuais.filter((p) => p !== passoId) : [...atuais, passoId];
  const proximo = { ...progresso, [objetivoId]: novos };

  gravar(proximo);

  return proximo;
}

export function recomecar(progresso: Progresso, objetivoId: string): Progresso {
  const resto = { ...progresso };

  delete resto[objetivoId];
  gravar(resto);

  return resto;
}

/** O primeiro passo ainda não feito (só os que existem hoje no objetivo), ou `null` se terminou. */
export function proximoPasso(objetivo: Objetivo, progresso: Progresso) {
  const feitos = progresso[objetivo.id] ?? [];

  return objetivo.passos.find((p) => !feitos.includes(p.id)) ?? null;
}

export function contarFeitos(objetivo: Objetivo, progresso: Progresso): number {
  const feitos = progresso[objetivo.id] ?? [];

  return objetivo.passos.filter((p) => feitos.includes(p.id)).length;
}
