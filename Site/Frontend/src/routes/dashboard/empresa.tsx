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
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/dashboard/empresa")({
  head: () => ({
    meta: [
      { title: textoDaPagina("dashboard.empresa.painelDaEmpresaAcesso") },
      {
        name: "description",
        content: textoDaPagina("dashboard.empresa.acompanheVagasPublicadas"),
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
  const { t } = useIdioma();
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
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t("dashboard.empresa.carregandoPainelDaEmpresa")}
        </div>
      </EstruturaApp>
    );
  }

  if (erroEmpresa || !empresa) {
    return (
      <EstruturaApp>
        <div role="alert" className="py-10 text-sm text-destructive">
          {t("dashboard.empresa.naoFoiPossivelCarregarOsDados")}
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
      <h1 className="text-3xl font-extrabold">{t("dashboard.empresa.painelDaEmpresa")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("dashboard.empresa.gerencieSuasVagasPublicadasE")}
      </p>

      {isLoading ? (
        <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t("dashboard.candidato.carregandoSuasMetricas")}
        </div>
      ) : isError ? (
        <div role="alert" className="mt-8 space-y-2 text-sm text-destructive">
          <p>{t("dashboard.empresa.naoFoiPossivelCarregarSuas")}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("raiz.tentarNovamente")}
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricaCard titulo={t("dashboard.empresa.vagasPublicadas")} valor={data?.vagas ?? 0} icon={Briefcase} />
            <MetricaCard titulo={t("dashboard.empresa.vagasAbertas")} valor={data?.vagasAbertas ?? 0} icon={ClipboardList} />
            <MetricaCard titulo={t("dashboard.empresa.candidaturasRecebidas")} valor={data?.candidaturas ?? 0} icon={ClipboardList} />
            <MetricaCard titulo={t("dashboard.empresa.seguidores")} valor={data?.seguidores ?? 0} icon={Users} />
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
            {t("dashboard.empresa.selecioneUmaVagaParaVerAs")}
          </div>
        )}
      </div>
    </EstruturaApp>
  );
}
