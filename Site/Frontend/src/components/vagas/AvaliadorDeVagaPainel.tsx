import { useState } from "react";
import { CheckCircle2, ListChecks, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { avaliarVaga, contarMelhorias, type DadosParaAvaliar, type ResultadoDaAvaliacao } from "@/lib/avaliadorDeVaga";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * "Avaliar a vaga antes de publicar": roda as regras do avaliador sobre o que está escrito agora e
 * mostra o que pode melhorar, com orientação. Cada ponto diz em PALAVRAS se está bom ou pode melhorar
 * (não só com cor ou ícone). Não bloqueia nada, não é certificação legal, e a pessoa pode ignorar.
 */
export function AvaliadorDeVagaPainel({ obterDados }: { obterDados: () => DadosParaAvaliar }) {
  const { t } = useIdioma();
  const [resultado, setResultado] = useState<ResultadoDaAvaliacao | null>(null);

  const melhorias = resultado ? contarMelhorias(resultado) : 0;

  return (
    <section aria-labelledby="avaliador-titulo" className="space-y-3 rounded-lg border border-border p-3">
      <h3 id="avaliador-titulo" className="text-sm font-bold">
        {t("vagas.avaliadorDeVagaPainel.avaliarAAcessibilidadeEA")}
      </h3>
      <p className="text-xs text-muted-foreground">{t("vagas.avaliadorDeVagaPainel.umaConferenciaRapidaDoQueEsta")}</p>

      <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" onClick={() => setResultado(avaliarVaga(obterDados()))}>
        <ListChecks className="size-4" aria-hidden="true" /> {resultado ? "Avaliar de novo" : "Avaliar agora"}
      </Button>

      {resultado ? (
        <div role="status" className="space-y-4">
          <p className="text-sm font-semibold">
            {melhorias === 0 ? "Nada a melhorar nos pontos conferidos." : melhorias === 1 ? "1 ponto pode melhorar." : `${melhorias} pontos podem melhorar.`}
          </p>

          <ul className="space-y-2">
            {resultado.pontos.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm">
                {p.situacao === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                <div>
                  <p>
                    <span className="font-semibold">{p.area}:</span> <span>{p.situacao === "ok" ? "Tudo certo." : "Pode melhorar."}</span> {p.titulo}.
                  </p>
                  <p className="text-muted-foreground">{p.orientacao}</p>
                </div>
              </li>
            ))}
          </ul>

          {resultado.expressoes.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <h4 className="text-sm font-bold">{t("vagas.avaliadorDeVagaPainel.expressoesQueCostumamExcluir")}</h4>
              <ul className="space-y-2 text-sm">
                {resultado.expressoes.map((e) => (
                  <li key={e.id}>
                    <p>
                      Em <span className="font-semibold">{e.campo}</span>: “<span className="font-semibold">{e.trecho}</span>”
                    </p>
                    <p className="text-muted-foreground">{e.explicacao}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{t("vagas.avaliadorDeVagaPainel.estaListaEUmApoioEPodeNao")}</p>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">{resultado.aviso}</p>
        </div>
      ) : null}
    </section>
  );
}
