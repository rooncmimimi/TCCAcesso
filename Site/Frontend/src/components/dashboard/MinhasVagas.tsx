import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { empresasService } from "@/services/empresas.service";
import { NovaVagaDialog } from "@/components/dashboard/NovaVagaDialog";
import { CardVagaEmpresa } from "@/components/dashboard/CardVagaEmpresa";
import { ROTULO_STATUS_VAGA } from "@/components/dashboard/constantesVaga";
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
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["minhas-vagas", status, pagina],
    queryFn: () => empresasService.vagasDaEmpresa({ status, page: pagina, limit: 5 }),
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando vagas…
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
        <p>Não foi possível carregar suas vagas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data || data.dados.length === 0) {
    const mensagem: Record<StatusVaga, string> = {
      Aberta: "Você ainda não tem vagas ativas. Publique a primeira acima.",
      Pausada: "Nenhuma vaga arquivada por aqui.",
      Encerrada: "Nenhuma vaga encerrada por aqui.",
    };
    return <p className="py-6 text-sm text-muted-foreground">{mensagem[status]}</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {data.dados.map((vaga) => (
          <li key={vaga.id}>
            <CardVagaEmpresa vaga={vaga} selecionada={vagaSelecionada === vaga.id} onVerCandidaturas={onSelecionar} />
          </li>
        ))}
      </ul>
      {data.totalPaginas > 1 ? (
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
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
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg">Minhas vagas</CardTitle>
        <NovaVagaDialog />
      </CardHeader>
      <Tabs defaultValue="Aberta" className="px-6 pb-6">
        <TabsList>
          <TabsTrigger value="Aberta">{ROTULO_STATUS_VAGA.Aberta}</TabsTrigger>
          <TabsTrigger value="Pausada">{ROTULO_STATUS_VAGA.Pausada}</TabsTrigger>
          <TabsTrigger value="Encerrada">{ROTULO_STATUS_VAGA.Encerrada}</TabsTrigger>
        </TabsList>
        <TabsContent value="Aberta">
          <ListaVagasPorStatus status="Aberta" vagaSelecionada={vagaSelecionada} onSelecionar={onSelecionar} />
        </TabsContent>
        <TabsContent value="Pausada">
          <ListaVagasPorStatus status="Pausada" vagaSelecionada={vagaSelecionada} onSelecionar={onSelecionar} />
        </TabsContent>
        <TabsContent value="Encerrada">
          <ListaVagasPorStatus status="Encerrada" vagaSelecionada={vagaSelecionada} onSelecionar={onSelecionar} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
