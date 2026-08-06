import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { adminService } from "@/services/admin.service";

export function EmpresasPendentesTabela() {
  const [pagina, setPagina] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-empresas", pagina],
    queryFn: () => adminService.empresas({ page: pagina, limit: 10 }),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["admin-empresas"] });

  const aprovar = useMutation({
    mutationFn: (id: string) => adminService.aprovarEmpresa(id),
    onSuccess: () => {
      toast.success("Empresa aprovada.");
      invalidar();
    },
    onError: () => toast.error("Não foi possível aprovar a empresa."),
  });

  const reprovar = useMutation({
    mutationFn: (id: string) => adminService.reprovarEmpresa(id),
    onSuccess: () => {
      toast.success("Empresa reprovada.");
      invalidar();
    },
    onError: () => toast.error("Não foi possível reprovar a empresa."),
  });

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando empresas…
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
        <p>Não foi possível carregar as empresas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data || data.dados.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">Nenhuma empresa cadastrada até o momento.</p>;
  }

  return (
    <>
      <Table>
        <caption className="sr-only">Lista de empresas cadastradas e seu status de aprovação</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.dados.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell className="font-medium">{empresa.nomeFantasia ?? empresa.razaoSocial}</TableCell>
              <TableCell>{empresa.cnpj ?? "—"}</TableCell>
              <TableCell>{empresa.aprovada ? "Aprovada" : "Pendente"}</TableCell>
              <TableCell className="text-right">
                {!empresa.aprovada ? (
                  <div className="flex justify-end gap-2">
                    <ConfirmarAcaoDialog
                      trigger={
                        <Button size="sm" className="min-h-11 gap-1">
                          <CheckCircle2 className="size-4" aria-hidden="true" /> Aprovar
                        </Button>
                      }
                      titulo="Aprovar empresa?"
                      descricao={`Confirmar a aprovação de "${empresa.nomeFantasia ?? empresa.razaoSocial}"?`}
                      rotuloConfirmar="Aprovar"
                      onConfirmar={() => aprovar.mutate(empresa.id)}
                    />
                    <ConfirmarAcaoDialog
                      trigger={
                        <Button size="sm" variant="outline" className="min-h-11 gap-1 text-destructive">
                          <XCircle className="size-4" aria-hidden="true" /> Reprovar
                        </Button>
                      }
                      titulo="Reprovar empresa?"
                      descricao={`Confirmar a reprovação de "${empresa.nomeFantasia ?? empresa.razaoSocial}"?`}
                      rotuloConfirmar="Reprovar"
                      destrutivo
                      onConfirmar={() => reprovar.mutate(empresa.id)}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Sem ações pendentes</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.totalPaginas > 1 ? (
        <div className="mt-4 flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
            Página anterior
          </Button>
          <span className="self-center text-sm text-muted-foreground">
            Página {data.pagina} de {data.totalPaginas}
          </span>
          <Button variant="outline" size="sm" disabled={pagina >= data.totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            Próxima página
          </Button>
        </div>
      ) : null}
    </>
  );
}
