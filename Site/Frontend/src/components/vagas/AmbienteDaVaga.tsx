import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";

import { ambienteService } from "@/services/ambiente.service";
import type { Vaga } from "@/types";

const SITUACAO: Record<string, string> = { sim: "Sim", parcial: "Parcial", nao: "Não" };

/**
 * O que a empresa informou sobre o ambiente da vaga: prévia sensorial, acessibilidade física e o que
 * a entrevista oferece. Cada bloco mostra SÓ o que foi informado; o resto aparece como "a empresa não
 * informou", nunca como suposição. O que a moderação verificou ganha um selo com texto (não só cor);
 * o que é só declaração diz "declarado pela empresa".
 */
export function AmbienteDaVaga({ vaga }: { vaga: Vaga }) {
  const { data: catalogo } = useQuery({ queryKey: ["vagas", "catalogo-acessibilidade"], queryFn: () => ambienteService.catalogo(), staleTime: 60 * 60 * 1000 });

  if (!catalogo) return null;

  const sensorial = vaga.ambienteSensorial ?? {};
  const caracteristicas = catalogo.ambienteSensorial.filter((c) => sensorial[c.chave]);
  const rotina = sensorial.rotina;
  const fisico = vaga.acessibilidadeFisica ?? {};
  const itensFisicos = catalogo.itensFisicos.filter((i) => fisico[i.chave]);
  const entrevista = (vaga.entrevistaAdaptacoes ?? []).map((chave) => catalogo.entrevista.find((o) => o.chave === chave)?.rotulo ?? chave);

  return (
    <div className="space-y-6">
      <section aria-labelledby="amb-entrevista">
        <h2 id="amb-entrevista" className="text-lg font-bold">
          Entrevista adaptável
        </h2>
        {entrevista.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">A empresa informou que a entrevista desta vaga oferece:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {entrevista.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {vaga.entrevistaObservacao ? <p className="mt-2 text-sm">{vaga.entrevistaObservacao}</p> : null}
            <p className="mt-2 text-xs text-muted-foreground">Ao se candidatar, você pode pedir outras adaptações. A empresa responde a cada pedido.</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">A empresa não informou quais adaptações a entrevista oferece. Você pode pedir adaptações ao se candidatar.</p>
        )}
      </section>

      <section aria-labelledby="amb-sensorial">
        <h2 id="amb-sensorial" className="text-lg font-bold">
          Ambiente de trabalho
        </h2>
        {caracteristicas.length > 0 || rotina ? (
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {caracteristicas.map((c) => (
              <div key={c.chave}>
                <dt className="font-semibold">{c.rotulo}</dt>
                <dd>{c.opcoes.find((o) => o.valor === sensorial[c.chave])?.rotulo ?? sensorial[c.chave]}</dd>
              </div>
            ))}
            {rotina ? (
              <div className="sm:col-span-2">
                <dt className="font-semibold">Como é a rotina</dt>
                <dd className="whitespace-pre-line">{rotina}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">A empresa não informou como é o ambiente (ruído, iluminação, espaço, pausas). Você pode perguntar a ela antes de se candidatar.</p>
        )}
      </section>

      <section aria-labelledby="amb-fisica">
        <h2 id="amb-fisica" className="text-lg font-bold">
          Acessibilidade física do local
        </h2>
        {itensFisicos.length > 0 ? (
          <>
            <ul className="mt-2 space-y-2 text-sm">
              {itensFisicos.map((i) => {
                const item = fisico[i.chave]!;

                return (
                  <li key={i.chave} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{i.rotulo}:</span>
                    <span>{SITUACAO[item.situacao] ?? item.situacao}</span>
                    {item.origem === "verificado" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">
                        <BadgeCheck className="size-3.5" aria-hidden="true" /> Verificado pela equipe do ACESSO
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">(declarado pela empresa)</span>
                    )}
                    {item.detalhe ? <span className="basis-full text-muted-foreground">{item.detalhe}</span> : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">O que não aparece aqui a empresa não informou. “Declarado” é o que a empresa afirmou; “verificado” é o que a equipe do ACESSO conferiu.</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">A empresa não informou a acessibilidade física do local (rampas, elevador, banheiro, entrada). Pergunte antes de ir.</p>
        )}
      </section>
    </div>
  );
}
