import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { candidaturasService } from "@/services/dashboard.service";
import type { StatusCandidatura, Vaga } from "@/types";

const OPCOES_STATUS: StatusCandidatura[] = ["Pendente", "EmAnalise", "Aprovada", "Reprovada"];

const ROTULOS: Record<string, string> = {
  Pendente: "Pendente",
  EmAnalise: "Em análise",
  Aprovada: "Aprovada",
  Reprovada: "Reprovada",
};

/** Candidaturas recebidas para uma vaga específica, com atualização de status. */
export function CandidaturasDaVaga({ vaga }: { vaga: Vaga }) {
  const [pagina, setPagina] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidaturas-da-vaga", vaga.id, pagina],
    queryFn: () => candidaturasService.daVaga(vaga.id, { page: pagina, limit: 6 }),
  });

  const atualizar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      candidaturasService.atualizarStatus(id, status),
    onSuccess: () => {
      toast.success("Status da candidatura atualizado.");
      queryClient.invalidateQueries({ queryKey: ["candidaturas-da-vaga", vaga.id] });
      queryClient.invalidateQueries({ queryKey: ["metricas-empresa"] });
    },
    onError: () => toast.error("Não foi possível atualizar o status."),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Candidaturas para "{vaga.titulo}"</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando candidaturas…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>Não foi possível carregar as candidaturas desta vaga.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nenhuma candidatura recebida para esta vaga ainda.</p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((candidatura) => (
                <li key={candidatura.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {candidatura.candidato?.usuario?.nome ?? "Candidato"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {candidatura.candidato?.tituloProfissional ?? "Sem título informado"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={candidatura.status} />
                    <label className="sr-only" htmlFor={`status-${candidatura.id}`}>
                      Atualizar status da candidatura de {candidatura.candidato?.usuario?.nome ?? "candidato"}
                    </label>
                    <Select
                      value={candidatura.status}
                      onValueChange={(status) => atualizar.mutate({ id: candidatura.id, status })}
                    >
                      <SelectTrigger id={`status-${candidatura.id}`} className="min-h-11 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCOES_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {ROTULOS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              ))}
            </ul>
            {data.totalPaginas > 1 ? (
              <div className="mt-4 flex justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Página anterior
                </Button>
                <span className="self-center text-sm text-muted-foreground">
                  Página {data.pagina} de {data.totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= data.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima página
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
