import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardService } from "@/services/dashboard.service";

/** Vagas que o candidato marcou como favoritas. */
export function VagasFavoritas() {
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vagas-favoritas", pagina],
    queryFn: () => dashboardService.favoritos({ page: pagina, limit: 5 }),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Vagas favoritas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando favoritas…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>Não foi possível carregar suas vagas favoritas.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Você ainda não favoritou nenhuma vaga.{" "}
            <Link to="/vagas" className="font-medium text-primary underline">
              Explorar vagas
            </Link>
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((vaga) => (
                <li key={vaga.id} className="py-3">
                  <p className="font-semibold">{vaga.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {vaga.empresa?.nomeFantasia ?? vaga.empresa?.razaoSocial ?? "Empresa"}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" aria-hidden="true" />
                    {vaga.cidade ?? "Local não informado"} · {vaga.modalidade}
                  </p>
                  <Badge variant="secondary" className="mt-2 font-medium">
                    {vaga.status}
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
                  Página anterior
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
                  Próxima página
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
