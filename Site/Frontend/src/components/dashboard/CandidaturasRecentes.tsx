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
import { useIdioma } from "@/hooks/useIdioma";
import { StatusBadge } from "@/components/StatusBadge";
import { AdaptacoesDaMinhaCandidatura } from "@/components/candidatura/AdaptacoesDaMinhaCandidatura";
import { RascunhosDeCandidatura } from "@/components/candidatura/RascunhosDeCandidatura";
import { candidaturasService } from "@/services/dashboard.service";
import type { Candidatura } from "@/types";
import type { AdaptacoesDoCandidato } from "@/types/adaptacoes";

/** Lista as candidaturas recentes do candidato, com opção de cancelamento. */
export function CandidaturasRecentes() {
  const { t } = useIdioma();
  const [pagina, setPagina] = useState(1);
  const queryClient = useQueryClient();

  // Mesmo prefixo de chave de `/vaga/$vagaId` (`["candidaturas", "minhas"]`) para o mesmo recurso
  // (`candidaturasService.minhas()`): invalidar esse prefixo atualiza as duas telas, mesmo com a
  // página como terceiro elemento.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidaturas", "minhas", pagina],
    queryFn: () => candidaturasService.minhas({ page: pagina, limit: 5 }),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => candidaturasService.cancelar(id),
    onSuccess: () => {
      toast.success(t("dashboard.candidaturasRecentes.candidaturaCancelada"));
      queryClient.invalidateQueries({ queryKey: ["candidaturas", "minhas"] });
      queryClient.invalidateQueries({ queryKey: ["metricas-candidato"] });
    },
    onError: () => toast.error(t("dashboard.candidaturasRecentes.naoFoiPossivelCancelarA")),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{t("dashboard.candidaturasRecentes.minhasCandidaturasRecentes")}</CardTitle>
      </CardHeader>
      <CardContent>
        <RascunhosDeCandidatura />
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t("dashboard.candidaturasDaVaga.carregandoCandidaturas")}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>{t("dashboard.candidaturasRecentes.naoFoiPossivelCarregarSuas")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("raiz.tentarNovamente")}
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {t("dashboard.candidaturasRecentes.voceAindaNaoSeCandidatouA")}{" "}
            <Link to="/vagas" className="font-medium text-primary underline">
              {t("dashboard.candidaturasRecentes.explorarVagas")}
            </Link>
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((candidatura: Candidatura) => (
                <li key={candidatura.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{candidatura.vaga?.titulo ?? "vaga"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {candidatura.vaga?.empresa?.nomeFantasia ?? candidatura.vaga?.empresa?.razaoSocial ?? "Empresa"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={candidatura.status} />
                    {candidatura.status !== "cancelada" && candidatura.status !== "rejeitada" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-11 gap-1 text-destructive hover:text-destructive"
                            aria-label={t("dashboard.candidaturasRecentes.cancelarCandidaturaAVaga", { var1: candidatura.vaga?.titulo ?? "" })}
                          >
                            <XCircle className="size-4" aria-hidden="true" /> {t("post.cancelar")}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("dashboard.candidaturasRecentes.cancelarCandidatura")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("dashboard.candidaturasRecentes.prestesACancelar", {
                                vaga: candidatura.vaga?.titulo ?? "",
                              })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("auth.voltar")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => cancelar.mutate(candidatura.id)}>
                              {t("dashboard.candidaturasRecentes.confirmarCancelamento")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                  {candidatura.adaptacoes && candidatura.vaga ? (
                    <AdaptacoesDaMinhaCandidatura
                      candidaturaId={candidatura.id}
                      vagaId={candidatura.vaga.id}
                      tituloDaVaga={candidatura.vaga.titulo}
                      adaptacoes={candidatura.adaptacoes as AdaptacoesDoCandidato}
                      podeAlterar={candidatura.status !== "cancelada" && candidatura.status !== "rejeitada"}
                    />
                  ) : null}
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
                  {t("vagas.paginaAnterior")}
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
                  {t("vagas.proximaPagina")}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
