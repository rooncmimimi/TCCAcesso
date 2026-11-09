import { useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Sparkles, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SalvarInstrucao } from "@/components/acessibilidade/SalvarInstrucao";
import { useLeituraDestacada } from "@/hooks/useLeituraDestacada";
import { useVoz } from "@/hooks/useVoz";
import { montarResumoVaga, type SecaoDoResumo } from "@/lib/resumoVaga";
import { cn } from "@/lib/utils";
import type { Vaga } from "@/types";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Botão "Explique esta vaga de forma simples" e o resumo que ele abre. O resumo é montado por regras
 * fixas (`lib/resumoVaga.ts`), a partir dos campos da vaga em português, sem IA e sem inventar:
 * o que a empresa não informou aparece como tal. Com "Ouvir resumo", a voz lê com a palavra atual
 * destacada.
 */
export function ResumoVagaSimples({ vaga }: { vaga: Vaga }) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const idDoPainel = useId();
  const conteudo = useRef<HTMLDListElement>(null);
  const { suportado } = useVoz();
  const { ler } = useLeituraDestacada();
  const resumo = useMemo(() => montarResumoVaga(vaga), [vaga]);

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        className="min-h-12 gap-2"
        aria-expanded={aberto}
        aria-controls={idDoPainel}
        onClick={() => setAberto((v) => !v)}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {t("vagas.resumoVagaSimples.expliqueEstaVagaDeFormaSimples")}
        <ChevronDown className={cn("size-4 transition-transform", aberto && "rotate-180")} aria-hidden="true" />
      </Button>

      <section
        id={idDoPainel}
        hidden={!aberto}
        aria-label={t("vagas.resumoVagaSimples.resumoDaVagaEmLinguagemSimples")}
        className="mt-3 rounded-xl border border-border bg-card p-5"
      >
        {aberto && (
          <>
            <p className="text-xs text-muted-foreground">
              {t("vagas.resumoVagaSimples.resumoMontadoAutomaticamente")}
            </p>

            <dl ref={conteudo} className="mt-4 space-y-4">
              {resumo.secoes.map((secao) => (
                <SecaoResumo key={secao.id} secao={secao} />
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {suportado && (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 gap-1.5"
                  onClick={() => {
                    if (conteudo.current) ler(conteudo.current);
                  }}
                >
                  <Volume2 className="size-4" aria-hidden="true" /> {t("vagas.resumoVagaSimples.ouvirResumo")}
                </Button>
              )}
              <SalvarInstrucao titulo={`Vaga: ${vaga.titulo}`} texto={resumo.textoFalado} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SecaoResumo({ secao }: { secao: SecaoDoResumo }) {
  return (
    <div>
      <dt className="text-sm font-bold">{secao.titulo}</dt>
      <dd className={cn("mt-1 text-sm", !secao.informado && "text-muted-foreground")}>
        {secao.tipo === "texto" ? (
          secao.texto
        ) : (
          <>
            <ul className="list-disc space-y-0.5 pl-5">
              {secao.itens.map((item, i) => (
                <li key={`${i}-${item}`}>{item}</li>
              ))}
            </ul>
            {secao.observacao && <p className="mt-1.5 text-xs text-muted-foreground">{secao.observacao}</p>}
          </>
        )}
      </dd>
    </div>
  );
}
