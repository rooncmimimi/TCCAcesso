import type { AcessibilidadeFisica, ItemFisico } from "@/types/ambiente";

export type LinhaDoMapa = {
  chave: string;
  rotulo: string;
  situacao: ItemFisico["situacao"];
  origem: ItemFisico["origem"];
  detalhe?: string;
  verificadoEm?: string;
};

/** Itens que a empresa informou, na ordem do catálogo. Item ausente (não informado) não aparece. */
export function linhasDoMapa(mapa: AcessibilidadeFisica | null | undefined, itensFisicos: { chave: string; rotulo: string }[]): LinhaDoMapa[] {
  const linhas: LinhaDoMapa[] = [];

  for (const { chave, rotulo } of itensFisicos) {
    const item = mapa?.[chave];

    if (!item) continue;

    linhas.push({ chave, rotulo, situacao: item.situacao, origem: item.origem === "verificado" ? "verificado" : "declarado", detalhe: item.detalhe, verificadoEm: item.verificadoEm });
  }

  return linhas;
}

/** Contagem simples para a lista de vagas: quantos itens a empresa informou e quantos já foram verificados. */
export function resumoDoMapa(mapa: AcessibilidadeFisica | null | undefined): { informados: number; verificados: number } {
  const itens = Object.values(mapa ?? {}).filter((i): i is ItemFisico => Boolean(i));

  return { informados: itens.length, verificados: itens.filter((i) => i.origem === "verificado").length };
}

export function textoDoResumo({ informados, verificados }: { informados: number; verificados: number }): string {
  if (informados === 0) return "Mapa físico: não informado";

  const itens = informados === 1 ? "1 item" : `${informados} itens`;
  const ver = verificados === 0 ? "nenhum verificado" : verificados === 1 ? "1 verificado" : `${verificados} verificados`;

  return `Mapa físico: ${itens}, ${ver}`;
}
