import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelatoriosCharts } from "@/components/admin/RelatoriosCharts";
import { obterRelatorios } from "@/services/admin.service";

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

const CARTOES: { chave: keyof RelatoriosTotais; rotulo: string }[] = [
  { chave: "usuarios", rotulo: "Usuários" },
  { chave: "candidatos", rotulo: "Candidatos" },
  { chave: "empresas", rotulo: "Empresas" },
  { chave: "empresasPendentes", rotulo: "Empresas pendentes" },
  { chave: "vagas", rotulo: "Vagas" },
  { chave: "vagasAbertas", rotulo: "Vagas abertas" },
  { chave: "candidaturas", rotulo: "Candidaturas" },
  { chave: "postagens", rotulo: "Publicações" },
  { chave: "usuariosBloqueados", rotulo: "Usuários bloqueados" },
  { chave: "contratacoes", rotulo: "Contratações" },
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
  contratacoes: number;
};

function RelatoriosAdmin() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "relatorios"],
    queryFn: () => obterRelatorios(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 p-6">
        <p className="text-sm">Não foi possível carregar os relatórios.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Tentar novamente
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
        <h1 className="text-3xl font-extrabold">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atualizado em {new Date(data.atualizadoEm).toLocaleString("pt-BR")}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CARTOES.map(({ chave, rotulo }) => (
          <li key={chave}>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{rotulo}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold">{totais[chave] ?? 0}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <RelatoriosCharts visaoGeral={visaoGeral} candidaturasPorStatus={data.candidaturasPorStatus} />

      {data.deficienciasMaisComuns.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Deficiências mais declaradas</CardTitle>
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
