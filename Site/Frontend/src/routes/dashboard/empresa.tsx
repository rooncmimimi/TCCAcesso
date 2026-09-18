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
import type { Vaga } from "@/types";

export const Route = createFileRoute("/dashboard/empresa")({
  head: () => ({
    meta: [
      { title: "Painel da empresa — ACESSO" },
      {
        name: "description",
        content: "Acompanhe vagas publicadas, candidaturas recebidas e seguidores da sua empresa.",
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["empresa"]}>
      <PainelEmpresa />
    </GuardaAcesso>
  ),
});

function PainelEmpresa() {
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
    .map(([status, total]) => `${status}: ${total}`)
    .join(", ");

  if (carregandoEmpresa) {
    return (
      <EstruturaApp>
        <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando painel da empresa…
        </div>
      </EstruturaApp>
    );
  }

  if (erroEmpresa || !empresa) {
    return (
      <EstruturaApp>
        <div role="alert" className="py-10 text-sm text-destructive">
          Não foi possível carregar os dados da sua empresa. Tente novamente mais tarde.
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
      <h1 className="text-3xl font-extrabold">Painel da empresa</h1>
      <p className="mt-2 text-muted-foreground">
        Gerencie suas vagas publicadas e acompanhe as candidaturas recebidas.
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
            <MetricaCard titulo="Vagas publicadas" valor={data?.vagas ?? 0} icon={Briefcase} />
            <MetricaCard titulo="Vagas abertas" valor={data?.vagasAbertas ?? 0} icon={ClipboardList} />
            <MetricaCard titulo="Candidaturas recebidas" valor={data?.candidaturas ?? 0} icon={ClipboardList} />
            <MetricaCard titulo="Seguidores" valor={data?.seguidores ?? 0} icon={Users} />
          </div>

          {resumoTextual ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Resumo das candidaturas recebidas por status: {resumoTextual}.
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
            Selecione uma vaga para ver as candidaturas recebidas.
          </div>
        )}
      </div>
    </EstruturaApp>
  );
}
