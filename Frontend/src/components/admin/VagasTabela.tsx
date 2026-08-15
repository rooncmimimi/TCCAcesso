import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { useSession } from "@/lib/session";
import {
  alterarStatusVaga,
  listarVagas,
  removerVaga,
  type VagaAdmin,
} from "@/services/admin.service";

const STATUS: VagaAdmin["status"][] = ["Aberta", "Pausada", "Encerrada"];

const TOM: Record<VagaAdmin["status"], "sucesso" | "atencao" | "neutro"> = {
  Aberta: "sucesso",
  Pausada: "atencao",
  Encerrada: "neutro",
};

export function VagasTabela() {
  const { user } = useSession();

  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<VagaAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "vagas", pagina],
    queryFn: () => listarVagas({ page: pagina, limit: 10 }),
    enabled: Boolean(user),
  });

  const statusMutacao = useMutation({
    mutationFn: (payload: { id: string; status: VagaAdmin["status"] }) =>
      alterarStatusVaga(payload.id, payload.status),
    onSuccess: () => {
      toast.success("Status da vaga atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível atualizar o status."),
  });

  const remocaoMutacao = useMutation({
    mutationFn: (vaga: VagaAdmin) => removerVaga(vaga.id),
    onSuccess: () => {
      toast.success("Vaga removida.");
      queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
      setAlvo(null);
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível remover a vaga."),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
        {Array.from({ length: 5 }).map((_, indice) => (
          <Skeleton key={indice} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar as vagas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const vagas = data?.vagas ?? [];

  if (vagas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Briefcase className="size-8" aria-hidden="true" />
        <p className="text-sm">Nenhuma vaga publicada até o momento.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vaga</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Alterar status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vagas.map((vaga) => (
            <TableRow key={vaga.id}>
              <TableCell className="font-medium">{vaga.titulo}</TableCell>
              <TableCell>
                {[vaga.cidade, vaga.estado].filter(Boolean).join("/") || vaga.modalidade || "—"}
              </TableCell>
              <TableCell>
                <StatusBadge tom={TOM[vaga.status]}>{vaga.status}</StatusBadge>
              </TableCell>
              <TableCell>
                <Select
                  value={vaga.status}
                  onValueChange={(valor) =>
                    statusMutacao.mutate({ id: vaga.id, status: valor as VagaAdmin["status"] })
                  }
                >
                  <SelectTrigger className="w-36" aria-label={`Alterar status da vaga ${vaga.titulo}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAlvo(vaga)}
                  aria-label={`Remover vaga ${vaga.titulo}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remover
                </Button>
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

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo="Remover vaga"
        descricao={`A vaga "${alvo?.titulo}" será removida da plataforma. Deseja continuar?`}
        textoConfirmar="Remover"
        destrutivo
        carregando={remocaoMutacao.isPending}
        onConfirmar={() => alvo && remocaoMutacao.mutate(alvo)}
      />
    </div>
  );
}
