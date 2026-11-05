import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CandidaturaDialog } from "@/components/candidatura/CandidaturaDialog";
import { candidaturaAdaptacoesService } from "@/services/adaptacoes.service";
import { extrairMensagemErro } from "@/services/api";

const ROTULO_DA_ETAPA = { mensagem: "mensagem", adaptacoes: "adaptações", revisao: "revisão" } as const;

/**
 * Candidaturas em andamento (rascunhos): a pessoa continua de onde parou ou descarta. Só aparecem
 * para ela; a empresa nunca vê rascunho, e nenhum rascunho conta como candidatura.
 */
export function RascunhosDeCandidatura() {
  const queryClient = useQueryClient();
  const [continuando, setContinuando] = useState<{ id: string; titulo: string } | null>(null);

  const { data } = useQuery({ queryKey: ["candidaturas", "rascunhos"], queryFn: () => candidaturaAdaptacoesService.meusRascunhos() });

  const descartar = useMutation({
    mutationFn: (vagaId: string) => candidaturaAdaptacoesService.descartarRascunho(vagaId),
    onSuccess: () => {
      toast.success("Rascunho descartado.");
      void queryClient.invalidateQueries({ queryKey: ["candidaturas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const rascunhos = (data ?? []).filter((r) => r.vaga);

  if (rascunhos.length === 0) return null;

  return (
    <section aria-labelledby="rascunhos-titulo" className="mb-4 space-y-2 rounded-lg border-2 border-primary/30 p-3">
      <h3 id="rascunhos-titulo" className="text-sm font-bold">
        Candidaturas em andamento
      </h3>
      <p className="text-xs text-muted-foreground">Ainda não foram enviadas: a empresa não sabe nada sobre elas.</p>
      <ul className="divide-y">
        {rascunhos.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{r.vaga!.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {r.vaga!.empresa ?? "Empresa"} · parou na etapa de {ROTULO_DA_ETAPA[r.etapa]}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="min-h-11" onClick={() => setContinuando({ id: r.vaga!.id, titulo: r.vaga!.titulo })} disabled={r.vaga!.status !== "aberta"}>
                {r.vaga!.status === "aberta" ? "Continuar" : "Vaga encerrada"}
              </Button>
              <Button size="sm" variant="ghost" className="min-h-11" onClick={() => descartar.mutate(r.vaga!.id)} disabled={descartar.isPending}>
                Descartar
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {continuando ? <CandidaturaDialog vaga={continuando} aberto aoFechar={() => setContinuando(null)} /> : null}
    </section>
  );
}
