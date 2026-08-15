import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Briefcase, FileText, Loader2, Users } from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CandidaturasRecentes } from "@/components/dashboard/CandidaturasRecentes";
import { VagasFavoritas } from "@/components/dashboard/VagasFavoritas";
import { dashboardService } from "@/services/dashboard.service";

export const Route = createFileRoute("/dashboard/candidato")({
  head: () => ({
    meta: [
      { title: "Meu painel — ACESSO" },
      {
        name: "description",
        content: "Acompanhe suas candidaturas, vagas favoritas e desempenho no ACESSO.",
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato"]}>
      <PainelCandidato />
    </GuardaAcesso>
  ),
});

function PainelCandidato() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metricas-candidato"],
    queryFn: () => dashboardService.candidato(),
  });

  const porStatus = data?.candidaturasPorStatus ?? {};
  const resumoTextual = Object.entries(porStatus)
    .map(([status, total]) => `${status}: ${total}`)
    .join(", ");

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Meu painel</h1>
      <p className="mt-2 text-muted-foreground">
        Acompanhe suas candidaturas, vagas favoritas e sua presença na comunidade.
      </p>

      {isLoading ? (
        <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando suas métricas…
        </div>
      ) : isError ? (
        <div role="alert" className="mt-8 space-y-2 text-sm text-destructive">
          <p>Não foi possível carregar suas métricas.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard titulo="Candidaturas" valor={data?.candidaturas ?? 0} icon={FileText} />
            <MetricCard titulo="Vagas favoritas" valor={data?.vagasFavoritas ?? 0} icon={Bookmark} />
            <MetricCard titulo="Publicações" valor={data?.postagens ?? 0} icon={Briefcase} />
            <MetricCard titulo="Seguidores" valor={data?.seguidores ?? 0} icon={Users} />
          </div>

          {resumoTextual ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Resumo das suas candidaturas por status: {resumoTextual}.
            </p>
          ) : null}
        </>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CandidaturasRecentes />
        <VagasFavoritas />
      </div>
    </AppShell>
  );
}
