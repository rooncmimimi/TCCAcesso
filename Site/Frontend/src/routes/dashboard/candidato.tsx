import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Briefcase, FileText, Loader2, Users } from "lucide-react";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { MetricaCard } from "@/components/dashboard/MetricaCard";
import { CandidaturasRecentes } from "@/components/dashboard/CandidaturasRecentes";
import { VagasFavoritas } from "@/components/dashboard/VagasFavoritas";
import { dashboardService } from "@/services/dashboard.service";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/dashboard/candidato")({
  head: () => metaPagina(dic().dashboard.meta.candidato),
  component: () => (
    <GuardaAcesso tipos={["candidato"]}>
      <PainelCandidato />
    </GuardaAcesso>
  ),
});

function PainelCandidato() {
  const t = useT();
  const td = t.dashboard;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metricas-candidato"],
    queryFn: () => dashboardService.candidato(),
  });

  const porStatus = data?.candidaturasPorStatus ?? {};
  const resumoTextual = Object.entries(porStatus)
    .map(([status, total]) => `${(t.status as Record<string, string>)[status] ?? status}: ${total}`)
    .join(", ");

  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{td.candidato.titulo}</h1>
      <p className="mt-2 text-muted-foreground">
        {td.candidato.intro}
      </p>

      {isLoading ? (
        <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {td.carregandoMetricas}
        </div>
      ) : isError ? (
        <div role="alert" className="mt-8 space-y-2 text-sm text-destructive">
          <p>{td.erroMetricas}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t.comum.tentarNovamente}
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricaCard titulo={td.candidato.candidaturas} valor={data?.candidaturas ?? 0} icon={FileText} />
            <MetricaCard titulo={td.candidato.favoritas} valor={data?.vagasFavoritas ?? 0} icon={Bookmark} />
            <MetricaCard titulo={td.candidato.publicacoes} valor={data?.postagens ?? 0} icon={Briefcase} />
            <MetricaCard titulo={td.candidato.seguidores} valor={data?.seguidores ?? 0} icon={Users} />
          </div>

          {resumoTextual ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {td.candidato.resumoStatus(resumoTextual)}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CandidaturasRecentes />
        <VagasFavoritas />
      </div>
    </EstruturaApp>
  );
}
