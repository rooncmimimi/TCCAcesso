import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { candidaturasService } from "@/services/dashboard.service";
import type { Candidatura } from "@/types";

/** Lista as candidaturas recentes do candidato, com opção de cancelamento. */
export function CandidaturasRecentes() {
  const [pagina, setPagina] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidaturas-minhas", pagina],
    queryFn: () => candidaturasService.minhas({ page: pagina, limit: 5 }),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => candidaturasService.cancelar(id),
    onSuccess: () => {
      toast.success("Candidatura cancelada.");
      queryClient.invalidateQueries({ queryKey: ["candidaturas-minhas"] });
      queryClient.invalidateQueries({ queryKey: ["metricas-candidato"] });
    },
    onError: () => toast.error("Não foi possível cancelar a candidatura."),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Minhas candidaturas recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando candidaturas…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>Não foi possível carregar suas candidaturas.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Você ainda não se candidatou a nenhuma vaga.{" "}
            <Link to="/vagas" className="font-medium text-primary underline">
              Explorar vagas
            </Link>
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((candidatura: Candidatura) => (
                <li key={candidatura.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{candidatura.vaga?.titulo ?? "Vaga"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {candidatura.vaga?.empresa?.nomeFantasia ?? candidatura.vaga?.empresa?.razaoSocial ?? "Empresa"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={candidatura.status} />
                    {candidatura.status !== "Cancelada" && candidatura.status !== "Rejeitada" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 gap-1 text-destructive hover:text-destructive"
                            aria-label={`Cancelar candidatura à vaga ${candidatura.vaga?.titulo ?? ""}`}
                          >
                            <XCircle className="size-4" aria-hidden="true" /> Cancelar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar candidatura?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Você está prestes a cancelar sua candidatura à vaga "
                              {candidatura.vaga?.titulo}". Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Voltar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelar.mutate(candidatura.id)}>
                              Confirmar cancelamento
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
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
