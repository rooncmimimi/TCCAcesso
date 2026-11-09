import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GraficosRelatorios } from "@/components/admin/GraficosRelatorios";
import { obterRelatorios } from "@/services/admin.service";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Relatórios administrativos — ACESSO" },
      {
        name: "description",
        content: "Métricas de usuários, empresas, vagas e candidaturas da plataforma ACESSO.",
      },
      { property: "og:title", content: "Relatórios administrativos — ACESSO" },
      { property: "og:description", content: "Indicadores da plataforma em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelatoriosAdmin,
});

const CARTOES: { chave: keyof RelatoriosTotais; rotulo: ChaveBase }[] = [
  { chave: "usuarios", rotulo: "admin.index.usuarios" },
  { chave: "candidatos", rotulo: "admin.index.candidatos" },
  { chave: "empresas", rotulo: "admin.index.empresas" },
  { chave: "empresasPendentes", rotulo: "admin.index.empresasPendentes" },
  { chave: "vagas", rotulo: "cabecalho.vagas" },
  { chave: "vagasAbertas", rotulo: "admin.index.vagasAbertas" },
  { chave: "candidaturas", rotulo: "admin.index.candidaturas" },
  { chave: "postagens", rotulo: "admin.index.publicacoes" },
  { chave: "usuariosBloqueados", rotulo: "admin.index.usuariosBloqueados" },
  // Não há indicador de "Contratações": o número viria das candidaturas aprovadas, mas o ACESSO só
  // aproxima empresa e candidato e não confirma contratação, então o indicador prometeria um dado
  // que a plataforma não tem. O backend ainda envia o campo; ele só não é exibido.
];

type RelatoriosTotais = {
  usuarios: number;
  candidatos: number;
  empresas: number;
  empresasPendentes: number;
  vagas: number;
  vagasAbertas: number;
  candidaturas: number;
  postagens: number;
  usuariosBloqueados: number;
};

function RelatoriosAdmin() {
  const { t } = useIdioma();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "relatorios"],
    queryFn: () => obterRelatorios(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: CARTOES.length }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 p-6">
        <p className="text-sm">{t("admin.index.naoFoiPossivelCarregarOs")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("raiz.tentarNovamente")}
        </Button>
      </div>
    );
  }

  const totais = data.totais;
  const visaoGeral = [
    { categoria: "Candidatos", total: totais.candidatos },
    { categoria: "Empresas", total: totais.empresas },
    { categoria: "Vagas", total: totais.vagas },
    { categoria: "Candidaturas", total: totais.candidaturas },
    { categoria: "Publicações", total: totais.postagens },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{t("admin.index.relatorios")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualizado em {new Date(data.atualizadoEm).toLocaleString("pt-BR")}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CARTOES.map(({ chave, rotulo }) => (
          <li key={chave}>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t(rotulo)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold">{totais[chave] ?? 0}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <GraficosRelatorios visaoGeral={visaoGeral} candidaturasPorStatus={data.candidaturasPorStatus} />

      {data.deficienciasMaisComuns.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.index.deficienciasMaisDeclaradas")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.deficienciasMaisComuns.map((item) => (
                <li key={item.deficienciaId} className="flex justify-between text-sm">
                  <span>{item.deficiencia?.nome ?? "Não informada"}</span>
                  <span className="font-bold">{item.total}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
