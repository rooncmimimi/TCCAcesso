/**
 * Destaque APROXIMADO de palavra para vozes que não informam onde estão (sem o evento `boundary`,
 * como várias vozes de rede e muitas do Android).
 *
 * A voz diz quando COMEÇA e quando TERMINA cada frase, mas não cada palavra. Dentro da frase, o ACESSO
 * estima em que palavra a voz está: reparte o tempo da frase entre as palavras de acordo com o "peso"
 * de cada uma (letras, dígitos e pausas de pontuação) e acompanha o relógio. O ritmo da voz é medido a
 * cada frase terminada (a duração real contra o peso) e guardado na sessão, então a estimativa melhora
 * ao longo da leitura e com a velocidade escolhida.
 *
 * Isto é uma ESTIMATIVA, e a tela diz isso ("de forma aproximada"). Pode adiantar ou atrasar uma ou
 * duas palavras, principalmente na primeira frase de uma voz nova e em frases longas sem pontuação.
 * Quem precisa de precisão exata deve usar uma voz que informe as palavras (as locais do computador).
 *
 * Funções puras (o relógio recebe a hora de fora), para testar sem navegador.
 */

import { intervaloDaPalavra } from "@/lib/leituraDestacada";

/** Unidades de "peso" faladas por segundo, na velocidade 1. Calibrado depois da primeira frase. */
export const PESO_POR_SEGUNDO_PADRAO = 15;

const MINIMO_POR_SEGUNDO = 6;
const MAXIMO_POR_SEGUNDO = 40;

/** Quanto pesa cada tipo de pausa de pontuação, em unidades de peso (uma letra pesa 1). */
const PAUSA_VIRGULA = 3;
const PAUSA_FINAL = 6;

export type PalavraEstimada = {
  /** Posição da palavra em `texto` (sem a pontuação colada no fim). */
  inicio: number;
  fim: number;
  /** Instante, em ms desde o início da fala, em que a voz termina esta palavra. */
  ate: number;
};

export type Cronograma = {
  palavras: PalavraEstimada[];
  duracaoMs: number;
  pesoTotal: number;
};

/** Peso de uma palavra: letras valem 1; dígitos valem 2 (números se falam por extenso); mais o espaço e a pausa da pontuação. */
export function pesoDaPalavra(palavra: string): number {
  let peso = 1; // o espaço depois dela

  for (const c of palavra) {
    if (/\d/.test(c)) peso += 2;
    else if (/[\p{L}]/u.test(c)) peso += 1;
  }

  if (/[.!?…]+$/u.test(palavra)) peso += PAUSA_FINAL;
  else if (/[,;:]+$/u.test(palavra)) peso += PAUSA_VIRGULA;

  return peso;
}

/** Monta o cronograma estimado de `texto` (o que a voz vai dizer) a `pesoPorSegundo` unidades por segundo. */
export function criarCronograma(texto: string, pesoPorSegundo: number, velocidade = 1): Cronograma {
  const ritmo = Math.min(MAXIMO_POR_SEGUNDO, Math.max(MINIMO_POR_SEGUNDO, pesoPorSegundo)) * Math.max(0.1, velocidade);
  const palavras: PalavraEstimada[] = [];
  let acumulado = 0;

  for (const m of texto.matchAll(/\S+/g)) {
    const inicioBruto = m.index ?? 0;
    const intervalo = intervaloDaPalavra(texto, inicioBruto);

    acumulado += pesoDaPalavra(m[0]);
    if (intervalo) palavras.push({ inicio: intervalo[0], fim: intervalo[1], ate: (acumulado / ritmo) * 1000 });
  }

  return { palavras, duracaoMs: (acumulado / ritmo) * 1000, pesoTotal: acumulado };
}

/**
 * A palavra em que a voz deve estar `ms` depois de começar. Depois do fim estimado, fica na última
 * palavra (a voz pode ser mais lenta que o previsto e o fim real é quem encerra). `null` sem palavras.
 */
export function palavraNoInstante(cronograma: Cronograma, ms: number): PalavraEstimada | null {
  const { palavras } = cronograma;

  if (palavras.length === 0) return null;

  const t = Math.max(0, ms);

  return palavras.find((p) => t < p.ate) ?? palavras[palavras.length - 1];
}

/**
 * Novo ritmo (unidades por segundo, na velocidade 1) depois de uma frase terminar. Mistura metade do
 * que se sabia com a medição. Frases curtas demais ou tempos absurdos não entram: o resultado seria ruído.
 * Devolve `null` quando a medição não deve ser usada.
 */
export function novaCalibracao(atual: number, pesoTotal: number, duracaoMs: number, velocidade: number): number | null {
  if (pesoTotal < 20 || duracaoMs < 700 || duracaoMs > 60_000 || velocidade <= 0) return null;

  const medido = pesoTotal / (duracaoMs / 1000) / velocidade;

  if (!Number.isFinite(medido) || medido < MINIMO_POR_SEGUNDO || medido > MAXIMO_POR_SEGUNDO) return null;

  return Math.round((atual * 0.5 + medido * 0.5) * 100) / 100;
}

const CHAVE_DO_RITMO = "acesso:voz:peso-por-segundo";

/** O ritmo guardado nesta sessão, ou o padrão. */
export function lerRitmo(): number {
  try {
    const bruto = Number(window.sessionStorage.getItem(CHAVE_DO_RITMO));

    return Number.isFinite(bruto) && bruto >= MINIMO_POR_SEGUNDO && bruto <= MAXIMO_POR_SEGUNDO ? bruto : PESO_POR_SEGUNDO_PADRAO;
  } catch {
    return PESO_POR_SEGUNDO_PADRAO;
  }
}

export function gravarRitmo(valor: number): void {
  try {
    window.sessionStorage.setItem(CHAVE_DO_RITMO, String(valor));
  } catch {
    /* Sem sessionStorage, a calibração vale só até a próxima leitura. */
  }
}

/** Relógio de uma fala que sabe parar e continuar (pausa da leitura), sem contar o tempo parado. */
export type RelogioDeFala = {
  pausar: () => void;
  retomar: () => void;
  decorridoMs: () => number;
};

export function criarRelogio(agora: () => number = () => Date.now()): RelogioDeFala {
  const inicio = agora();
  let paradoDesde: number | null = null;
  let tempoParado = 0;

  return {
    pausar: () => {
      if (paradoDesde === null) paradoDesde = agora();
    },
    retomar: () => {
      if (paradoDesde !== null) {
        tempoParado += agora() - paradoDesde;
        paradoDesde = null;
      }
    },
    decorridoMs: () => (paradoDesde ?? agora()) - inicio - tempoParado,
  };
}
