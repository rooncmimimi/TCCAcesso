import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { empresasService } from "@/services/empresas.service";
import { NovaVagaDialog } from "@/components/dashboard/NovaVagaDialog";
import { VagaEmpresaCard } from "@/components/dashboard/VagaEmpresaCard";
import { useT } from "@/i18n";
import type { StatusVaga, Vaga } from "@/types";

/** Lista paginada de vagas de um status, com card de gestão para cada uma. */
function ListaVagasPorStatus({
  status,
  vagaSelecionada,
  onSelecionar,
}: {
  status: StatusVaga;
  vagaSelecionada: string | null;
  onSelecionar: (vaga: Vaga) => void;
}) {
  const t = useT();
  const td = t.dashboard;
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["minhas-vagas", status, pagina],
    queryFn: () => empresasService.vagasDaEmpresa({ status, page: pagina, limit: 5 }),
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {td.minhasVagas.carregando}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
        <p>{td.minhasVagas.erro}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  if (!data || data.dados.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">{td.minhasVagas.vazio[status]}</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {data.dados.map((vaga) => (
          <li key={vaga.id}>
            <VagaEmpresaCard vaga={vaga} selecionada={vagaSelecionada === vaga.id} onVerCandidaturas={onSelecionar} />
          </li>
        ))}
      </ul>
      {data.totalPaginas > 1 ? (
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
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
  );
}

/** Gestão das vagas da empresa: ativas, arquivadas e encerradas, com ações por vaga. */
export function MinhasVagas({
  vagaSelecionada,
  onSelecionar,
}: {
  vagaSelecionada: string | null;
  onSelecionar: (vaga: Vaga) => void;
}) {
  const t = useT();

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg">{t.dashboard.minhasVagas.titulo}</CardTitle>
        <NovaVagaDialog />
      </CardHeader>
      <Tabs defaultValue="aberta" className="px-6 pb-6">
        <TabsList>
          <TabsTrigger value="aberta">{t.status.aberta}</TabsTrigger>
          <TabsTrigger value="pausada">{t.status.pausada}</TabsTrigger>
          <TabsTrigger value="encerrada">{t.status.encerrada}</TabsTrigger>
        </TabsList>
        <TabsContent value="aberta">
          <ListaVagasPorStatus status="aberta" vagaSelecionada={vagaSelecionada} onSelecionar={onSelecionar} />
        </TabsContent>
        <TabsContent value="pausada">
          <ListaVagasPorStatus status="pausada" vagaSelecionada={vagaSelecionada} onSelecionar={onSelecionar} />
        </TabsContent>
        <TabsContent value="encerrada">
          <ListaVagasPorStatus status="encerrada" vagaSelecionada={vagaSelecionada} onSelecionar={onSelecionar} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
