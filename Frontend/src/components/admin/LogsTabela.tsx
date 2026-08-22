import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { listarLogs } from "@/services/admin.service";

/**
 * Visualizador de admin_audit_logs — SOMENTE LEITURA. Não existe (e não
 * deve existir) nenhuma ação de editar/excluir aqui: a tabela é
 * conceitualmente imutável, sem endpoint de escrita em nenhuma camada.
 */
export function LogsTabela({ entidadeId }: { entidadeId?: string } = {}) {
  const [pagina, setPagina] = useState(1);
  const [acao, setAcao] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "logs", pagina, acao, entidadeId],
    queryFn: () =>
      listarLogs({
        page: pagina,
        limit: 10,
        acao: acao || undefined,
        entidadeId,
      }),
  });

  const logs = data?.logs ?? [];

  return (
    <div>
      {!entidadeId && (
        <form
          className="flex flex-wrap items-end gap-3 p-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            setPagina(1);
          }}
        >
          <div className="min-w-56">
            <Label htmlFor="filtro-acao">Ação</Label>
            <Input
              id="filtro-acao"
              value={acao}
              onChange={(evento) => setAcao(evento.target.value)}
              placeholder="Ex.: BLOQUEAR_USUARIO"
              className="mt-1"
            />
          </div>
          <Button type="submit" className="min-h-11">
            Filtrar
          </Button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 5 }).map((_, indice) => (
            <Skeleton key={indice} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os logs.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <ScrollText className="size-8" aria-hidden="true" />
          <p className="text-sm">Nenhum registro de auditoria encontrado.</p>
        </div>
      ) : (
        <>
          <Table>
            <caption className="sr-only">Registros de auditoria administrativa (somente leitura)</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs font-semibold">{log.acao}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.entidadeTipo ?? "—"}
                  </TableCell>
                  <TableCell>{log.admin?.nome ?? "Conta removida"}</TableCell>
                  <TableCell className="max-w-72 truncate">{log.descricao ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PaginacaoTabela
            pagina={data?.pagina ?? 1}
            totalPaginas={data?.totalPaginas ?? 1}
            total={data?.total ?? 0}
            onPaginaChange={setPagina}
          />
        </>
      )}
    </div>
  );
}
