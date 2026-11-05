/**
 * O "motor" da varredura: um estado puro e as operações sobre ele (iniciar, pausar, avançar, voltar,
 * entrar e sair de grupos, selecionar). Nada aqui toca na página nem em relógio: quem liga o motor a
 * teclas, ao tempo e ao DOM é `hooks/useVarredura.ts`. Isso permite testar todo o comportamento sem
 * navegador.
 */

import type { Item } from "@/lib/varredura";

export type FaseDaVarredura = "parada" | "rodando" | "pausada";

export type EstadoDaVarredura = {
  fase: FaseDaVarredura;
  /** Primeiro nível: controles e grupos. */
  itens: Item[];
  /** Posição atual: [i] no primeiro nível, [i, j] dentro do grupo i. */
  caminho: number[];
};

export const ESTADO_PARADO: EstadoDaVarredura = { fase: "parada", itens: [], caminho: [0] };

/** Os itens do nível em que a varredura está agora. */
export function itensDoNivel(estado: EstadoDaVarredura): Item[] {
  if (estado.caminho.length === 1) return estado.itens;

  return estado.itens[estado.caminho[0]]?.filhos ?? [];
}

/** O item destacado agora, ou `null` se não há nada para percorrer. */
export function itemAtual(estado: EstadoDaVarredura): Item | null {
  if (estado.fase === "parada") return null;

  return itensDoNivel(estado)[estado.caminho[estado.caminho.length - 1]] ?? null;
}

/** A pessoa está dentro de um grupo? */
export const dentroDeGrupo = (estado: EstadoDaVarredura) => estado.caminho.length === 2;

/** O grupo em que a pessoa está, se estiver em um. */
export function grupoAtual(estado: EstadoDaVarredura): Item | null {
  return dentroDeGrupo(estado) ? (estado.itens[estado.caminho[0]] ?? null) : null;
}

export function iniciar(itens: Item[]): EstadoDaVarredura {
  return { fase: itens.length > 0 ? "rodando" : "parada", itens, caminho: [0] };
}

export const parar = (): EstadoDaVarredura => ESTADO_PARADO;

export function pausar(estado: EstadoDaVarredura): EstadoDaVarredura {
  return estado.fase === "rodando" ? { ...estado, fase: "pausada" } : estado;
}

export function continuar(estado: EstadoDaVarredura): EstadoDaVarredura {
  return estado.fase === "pausada" ? { ...estado, fase: "rodando" } : estado;
}

function moverPara(estado: EstadoDaVarredura, passo: 1 | -1): EstadoDaVarredura {
  if (estado.fase === "parada") return estado;

  const total = itensDoNivel(estado).length;

  if (total === 0) return estado;

  const ultimo = estado.caminho.length - 1;
  const proximo = (estado.caminho[ultimo] + passo + total) % total;

  return { ...estado, caminho: [...estado.caminho.slice(0, ultimo), proximo] };
}

/** Passa ao próximo item; depois do último, volta ao primeiro (a varredura nunca "acaba" sozinha). */
export const avancar = (estado: EstadoDaVarredura) => moverPara(estado, 1);

/** Volta ao item anterior; antes do primeiro, vai ao último. */
export const voltar = (estado: EstadoDaVarredura) => moverPara(estado, -1);

/** Sai do grupo, voltando ao primeiro nível no próprio grupo. Fora de grupo, não muda nada. */
export function sairDoGrupo(estado: EstadoDaVarredura): EstadoDaVarredura {
  return dentroDeGrupo(estado) ? { ...estado, caminho: [estado.caminho[0]] } : estado;
}

export type Efeito = { tipo: "nenhum" } | { tipo: "entrou-no-grupo"; grupo: Item } | { tipo: "ativar"; item: Item };

/**
 * Seleciona o item destacado. Em um grupo, entra nele (e o primeiro controle passa a ser o destacado);
 * em um controle, pede para ativá-lo. Quem ativa de verdade (clicar, focar o campo) é o chamador.
 */
export function selecionar(estado: EstadoDaVarredura): { estado: EstadoDaVarredura; efeito: Efeito } {
  const item = itemAtual(estado);

  if (!item) return { estado, efeito: { tipo: "nenhum" } };

  if (item.filhos && !dentroDeGrupo(estado)) {
    return { estado: { ...estado, caminho: [estado.caminho[0], 0] }, efeito: { tipo: "entrou-no-grupo", grupo: item } };
  }

  return { estado, efeito: { tipo: "ativar", item } };
}

/**
 * A página mudou (abriu um diálogo, carregou uma lista, trocou de rota): troca os itens mantendo a
 * posição quando o item destacado ainda existe; se ele sumiu, volta ao começo do primeiro nível. Se
 * não sobrou nada, a varredura para.
 */
export function atualizarItens(estado: EstadoDaVarredura, novos: Item[]): EstadoDaVarredura {
  if (estado.fase === "parada") return estado;

  if (novos.length === 0) return ESTADO_PARADO;

  const atual = itemAtual(estado);

  if (atual) {
    for (let i = 0; i < novos.length; i += 1) {
      if (novos[i].elemento === atual.elemento) return { ...estado, itens: novos, caminho: [i] };

      const j = novos[i].filhos?.findIndex((f) => f.elemento === atual.elemento) ?? -1;

      if (j >= 0) return { ...estado, itens: novos, caminho: dentroDeGrupo(estado) ? [i, j] : [i] };
    }
  }

  return { ...estado, itens: novos, caminho: [0] };
}
