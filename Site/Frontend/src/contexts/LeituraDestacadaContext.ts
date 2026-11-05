import { createContext } from "react";

/**
 * Como o trecho que está sendo lido aparece destacado:
 * - `palavra`: a palavra que a voz está dizendo (precisa do evento `boundary` da voz);
 * - `estimado`: a frase inteira e, dentro dela, a palavra ESTIMADA pelo tempo (vozes sem `boundary` de
 *   palavra); pode adiantar ou atrasar uma ou duas palavras;
 * - `frase`: só a frase inteira, uma de cada vez (vozes sem `boundary` de palavra, com a estimativa desligada);
 * - `bloco`: o bloco todo, sem acompanhar a fala (navegador sem CSS Custom Highlight API, ou o
 *   destaque por palavra desligado nas preferências).
 */
export type ModoDestaque = "palavra" | "estimado" | "frase" | "bloco";

export type LeituraDestacadaContextValue = {
  /** Há uma leitura destacada em andamento (inclui pausada). */
  lendo: boolean;
  pausado: boolean;
  /** Como o destaque está funcionando agora. `null` quando não há leitura. */
  modo: ModoDestaque | null;
  /**
   * Lê o texto visível de `alvo`, destacando o que está sendo dito. `prefixo` é falado antes do
   * texto e não é destacado (por exemplo "Título de nível 1: ").
   */
  ler: (alvo: HTMLElement, opcoes?: { prefixo?: string }) => void;
  pausar: () => void;
  retomar: () => void;
  parar: () => void;
};

export const LeituraDestacadaContext = createContext<LeituraDestacadaContextValue | null>(null);
