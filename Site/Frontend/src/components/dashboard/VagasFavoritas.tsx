import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardService } from "@/services/dashboard.service";
import { useT } from "@/i18n";

/** Vagas que o candidato marcou como favoritas. */
export function VagasFavoritas() {
  const t = useT();
  const td = t.dashboard;
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vagas-favoritas", pagina],
    queryFn: () => dashboardService.favoritos({ page: pagina, limit: 5 }),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">{td.favoritas.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {td.favoritas.carregando}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>{td.favoritas.erro}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t.comum.tentarNovamente}
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {td.favoritas.vazio}{" "}
            <Link to="/vagas" className="font-medium text-primary underline">
              {td.favoritas.explorar}
            </Link>
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((vaga) => (
                <li key={vaga.id} className="py-3">
                  <p className="font-semibold">{vaga.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? td.favoritas.empresaFallback}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" aria-hidden="true" />
                    {vaga.cidade ?? td.favoritas.localNaoInformado} · {t.vagas.modalidade[vaga.modalidade] ?? vaga.modalidade}
                  </p>
                  <Badge variant="secondary" className="mt-2 font-medium">
                    {(t.status as Record<string, string>)[vaga.status] ?? vaga.status}
                  </Badge>
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
                  {td.paginacao.anterior}
                </Button>
                <span className="self-center text-sm text-muted-foreground">
                  {td.paginacao.pagina(data.pagina, data.totalPaginas)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= data.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  {td.paginacao.proxima}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
