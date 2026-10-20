import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, ClipboardList, Loader2, Users } from "lucide-react";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { MetricaCard } from "@/components/dashboard/MetricaCard";
import { MinhasVagas } from "@/components/dashboard/MinhasVagas";
import { CandidaturasDaVaga } from "@/components/dashboard/CandidaturasDaVaga";
import { AvisoAprovacaoEmpresa } from "@/components/perfil/AvisoAprovacaoEmpresa";
import { dashboardService } from "@/services/dashboard.service";
import { empresasService } from "@/services/empresas.service";
import { dic, metaPagina, useT } from "@/i18n";
import type { Vaga } from "@/types";

export const Route = createFileRoute("/dashboard/empresa")({
  head: () => metaPagina(dic().dashboard.meta.empresa),
  component: () => (
    <GuardaAcesso tipos={["empresa"]}>
      <PainelEmpresa />
    </GuardaAcesso>
  ),
});

function PainelEmpresa() {
  const t = useT();
  const td = t.dashboard;
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null);

  const {
    data: empresa,
    isLoading: carregandoEmpresa,
    isError: erroEmpresa,
  } = useQuery({
    queryKey: ["minha-empresa"],
    queryFn: () => empresasService.minhaEmpresa(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metricas-empresa"],
    queryFn: () => dashboardService.empresa(),
    enabled: empresa?.statusAprovacao === "aprovada",
  });

  const porStatus = data?.candidaturasPorStatus ?? {};
  const resumoTextual = Object.entries(porStatus)
    .map(([status, total]) => `${(t.status as Record<string, string>)[status] ?? status}: ${total}`)
    .join(", ");

  if (carregandoEmpresa) {
    return (
      <EstruturaApp>
        <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {td.empresa.carregando}
        </div>
      </EstruturaApp>
    );
  }

  if (erroEmpresa || !empresa) {
    return (
      <EstruturaApp>
        <div role="alert" className="py-10 text-sm text-destructive">
          {td.empresa.erroEmpresa}
        </div>
      </EstruturaApp>
    );
  }

  if (empresa.statusAprovacao !== "aprovada") {
    return (
      <EstruturaApp>
        <AvisoAprovacaoEmpresa empresa={empresa} />
      </EstruturaApp>
    );
  }

  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{td.empresa.titulo}</h1>
      <p className="mt-2 text-muted-foreground">
        {td.empresa.intro}
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
            <MetricaCard titulo={td.empresa.publicadas} valor={data?.vagas ?? 0} icon={Briefcase} />
            <MetricaCard titulo={td.empresa.abertas} valor={data?.vagasAbertas ?? 0} icon={ClipboardList} />
            <MetricaCard titulo={td.empresa.recebidas} valor={data?.candidaturas ?? 0} icon={ClipboardList} />
            <MetricaCard titulo={td.empresa.seguidores} valor={data?.seguidores ?? 0} icon={Users} />
          </div>

          {resumoTextual ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {td.empresa.resumoStatus(resumoTextual)}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <MinhasVagas
          vagaSelecionada={vagaSelecionada?.id ?? null}
          onSelecionar={(vaga) => setVagaSelecionada(vaga)}
        />
        {vagaSelecionada ? (
          <CandidaturasDaVaga vaga={vagaSelecionada} />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {td.empresa.selecioneVaga}
          </div>
        )}
      </div>
    </EstruturaApp>
  );
}
