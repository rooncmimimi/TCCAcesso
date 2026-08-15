import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { empresasService } from "@/services/empresas.service";
import { NovaVagaDialog } from "@/components/dashboard/NovaVagaDialog";
import type { Vaga } from "@/types";

/** Lista as vagas publicadas pela empresa, permitindo selecionar uma para ver candidaturas. */
export function MinhasVagas({
  vagaSelecionada,
  onSelecionar,
}: {
  vagaSelecionada: string | null;
  onSelecionar: (vaga: Vaga) => void;
}) {
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["minhas-vagas", pagina],
    queryFn: () => empresasService.vagasDaEmpresa({ page: pagina, limit: 6 }),
  });

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg">Minhas vagas</CardTitle>
        <NovaVagaDialog />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando vagas…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>Não foi possível carregar suas vagas.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Você ainda não publicou nenhuma vaga.</p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((vaga) => (
                <li key={vaga.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{vaga.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {vaga.cidade ?? "Local não informado"} · {vaga.modalidade}
                    </p>
                    <Badge variant={vaga.status === "Aberta" ? "default" : "secondary"} className="mt-1 font-medium">
                      {vaga.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={vagaSelecionada === vaga.id ? "default" : "outline"}
                    className="min-h-11 shrink-0 gap-1"
                    onClick={() => onSelecionar(vaga)}
                  >
                    <Users className="size-4" aria-hidden="true" /> Candidaturas
                  </Button>
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
