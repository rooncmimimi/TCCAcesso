import { useQuery } from "@tanstack/react-query";

import { ambienteService } from "@/services/ambiente.service";

type Props = {
  /** Chaves das adaptações que a empresa informou que a entrevista da vaga já oferece. */
  adaptacoes?: string[] | null;
  observacao?: string | null;
};

/**
 * "O que esta vaga já oferece na entrevista", mostrado na etapa de adaptações da candidatura, para a
 * pessoa saber o que NÃO precisa pedir e pedir só o que falta. É informação da vaga, escrita pela
 * empresa: nada aqui vem do perfil da pessoa, e ver esta caixa não compartilha nada. Sem informação
 * da empresa, não aparece nada (o texto "a empresa não informou" fica na página da vaga).
 */
export function EntrevistaOferecida({ adaptacoes, observacao }: Props) {
  const temItens = (adaptacoes?.length ?? 0) > 0;

  const { data: catalogo } = useQuery({
    queryKey: ["vagas", "catalogo-acessibilidade"],
    queryFn: () => ambienteService.catalogo(),
    staleTime: 60 * 60 * 1000,
    enabled: temItens,
  });

  if (!temItens) return null;

  const rotulos = (adaptacoes ?? []).map((chave) => catalogo?.entrevista.find((o) => o.chave === chave)?.rotulo ?? null);

  // Enquanto o catálogo não chega, não mostra chave técnica solta.
  if (!catalogo) return null;

  return (
    <section aria-labelledby="entrevista-oferecida" className="space-y-2 rounded-lg border border-primary/40 bg-primary-soft/40 p-3">
      <h3 id="entrevista-oferecida" className="text-sm font-bold">
        O que esta vaga já oferece na entrevista
      </h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {rotulos.map((rotulo, i) => (rotulo ? <li key={adaptacoes![i]}>{rotulo}</li> : null))}
      </ul>
      {observacao ? <p className="text-sm">{observacao}</p> : null}
      <p className="text-xs text-muted-foreground">Você não precisa pedir de novo o que está nesta lista. Peça aqui só o que mais precisar. Esta informação é da empresa e não compartilha nada seu.</p>
    </section>
  );
}
