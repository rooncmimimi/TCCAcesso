import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GraficosRelatorios } from "@/components/admin/GraficosRelatorios";
import { rotuloOuValor } from "@/components/admin/rotulos";
import { obterRelatorios } from "@/services/admin.service";
import { dic, localeDoIdioma, metaPagina, useIdioma, useT } from "@/i18n";
import { formatarDataHoraLocal } from "@/utils/formatacao";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      ...metaPagina(dic().admin.meta.relatorios).meta,
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelatoriosAdmin,
});

const CARTOES: (keyof RelatoriosTotais)[] = [
  "usuarios",
  "candidatos",
  "empresas",
  "empresasPendentes",
  "vagas",
  "vagasAbertas",
  "candidaturas",
  "postagens",
  "usuariosBloqueados",
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
  const t = useT();
  const tr = t.admin.relatorios;
  const { idioma } = useIdioma();
  const numero = new Intl.NumberFormat(localeDoIdioma(idioma));
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
        <p className="text-sm">{tr.erro}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  const totais = data.totais;
  const visaoGeral = [
    { categoria: tr.visaoGeral.candidatos, total: totais.candidatos },
    { categoria: tr.visaoGeral.empresas, total: totais.empresas },
    { categoria: tr.visaoGeral.vagas, total: totais.vagas },
    { categoria: tr.visaoGeral.candidaturas, total: totais.candidaturas },
    { categoria: tr.visaoGeral.postagens, total: totais.postagens },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{tr.titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr.atualizadoEm(formatarDataHoraLocal(data.atualizadoEm))}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CARTOES.map((chave) => (
          <li key={chave}>
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{tr.cartoes[chave]}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-extrabold">{numero.format(Number(totais[chave] ?? 0))}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <GraficosRelatorios visaoGeral={visaoGeral} candidaturasPorStatus={data.candidaturasPorStatus} />

      {data.deficienciasMaisComuns.length > 0 && (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{tr.deficienciasTitulo}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.deficienciasMaisComuns.map((item) => (
                <li key={item.deficienciaId} className="flex justify-between text-sm">
                  <span>
                    {item.deficiencia?.nome
                      ? rotuloOuValor(t.perfilItens.deficiencias.catalogo, item.deficiencia.nome)
                      : tr.deficienciaNaoInformada}
                  </span>
                  <span className="font-bold">{numero.format(Number(item.total))}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
