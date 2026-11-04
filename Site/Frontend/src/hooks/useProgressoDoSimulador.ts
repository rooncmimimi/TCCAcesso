import { useCallback, useState } from "react";

import type { Importancia } from "@/dados/simulador";

export type ModoDoSimulador = "menu" | "candidatura" | "entrevista";

export type ProgressoDoSimulador = {
  modo: ModoDoSimulador;
  passoCandidatura: number;
  classificacao: Record<string, Importancia>;
  experiencias: string[];
  habilidades: string[];
  textos: Record<string, string>;
  passoEntrevista: number;
  respostas: Record<string, string>;
};

export const CHAVE_DO_SIMULADOR = "acesso:simulador";

export const PROGRESSO_INICIAL: ProgressoDoSimulador = {
  modo: "menu",
  passoCandidatura: 0,
  classificacao: {},
  experiencias: [],
  habilidades: [],
  textos: {},
  passoEntrevista: 0,
  respostas: {},
};

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function soTextos(v: unknown): Record<string, string> {
  if (!ehObjeto(v)) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === "string").map(([k, t]) => [k, t.slice(0, 4000)]));
}

function lerGuardado(): ProgressoDoSimulador {
  try {
    const bruto = window.localStorage.getItem(CHAVE_DO_SIMULADOR);
    if (!bruto) return PROGRESSO_INICIAL;
    const lido: unknown = JSON.parse(bruto);
    if (!ehObjeto(lido)) return PROGRESSO_INICIAL;

    const classificacao = ehObjeto(lido.classificacao)
      ? (Object.fromEntries(Object.entries(lido.classificacao).filter(([, v]) => v === "obrigatorio" || v === "desejavel")) as Record<string, Importancia>)
      : {};

    return {
      modo: lido.modo === "candidatura" || lido.modo === "entrevista" ? lido.modo : "menu",
      passoCandidatura: typeof lido.passoCandidatura === "number" ? Math.max(0, Math.floor(lido.passoCandidatura)) : 0,
      classificacao,
      experiencias: Array.isArray(lido.experiencias) ? lido.experiencias.filter((x): x is string => typeof x === "string") : [],
      habilidades: Array.isArray(lido.habilidades) ? lido.habilidades.filter((x): x is string => typeof x === "string") : [],
      textos: soTextos(lido.textos),
      passoEntrevista: typeof lido.passoEntrevista === "number" ? Math.max(0, Math.floor(lido.passoEntrevista)) : 0,
      respostas: soTextos(lido.respostas),
    };
  } catch {
    return PROGRESSO_INICIAL;
  }
}

/**
 * O progresso do treino, guardado SÓ neste navegador (localStorage), para pausar e continuar sem
 * perder nada. É conteúdo de treino com dados fictícios: nunca vai ao servidor nem a empresa alguma,
 * e nada do perfil real entra aqui.
 */
export function useProgressoDoSimulador() {
  const [progresso, setProgresso] = useState<ProgressoDoSimulador>(lerGuardado);

  const atualizar = useCallback((mudanca: Partial<ProgressoDoSimulador>) => {
    setProgresso((atual) => {
      const novo = { ...atual, ...mudanca };

      try {
        window.localStorage.setItem(CHAVE_DO_SIMULADOR, JSON.stringify(novo));
      } catch {
        /* Sem armazenamento, o treino segue, só não é retomado depois. */
      }

      return novo;
    });
  }, []);

  const recomecar = useCallback(() => {
    try {
      window.localStorage.removeItem(CHAVE_DO_SIMULADOR);
    } catch {
      /* Nada a apagar se o armazenamento não existe. */
    }

    setProgresso(PROGRESSO_INICIAL);
  }, []);

  return { progresso, atualizar, recomecar };
}

/** Há algo a retomar? */
export function temProgresso(p: ProgressoDoSimulador): boolean {
  return (
    p.passoCandidatura > 0 ||
    p.passoEntrevista > 0 ||
    Object.keys(p.classificacao).length > 0 ||
    p.experiencias.length > 0 ||
    p.habilidades.length > 0 ||
    Object.values(p.textos).some(Boolean) ||
    Object.values(p.respostas).some(Boolean)
  );
}
