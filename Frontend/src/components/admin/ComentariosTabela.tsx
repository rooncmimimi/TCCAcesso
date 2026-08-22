import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Trash2 } from "lucide-react";

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
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { extrairMensagemErro } from "@/services/api";
import { listarComentarios, removerComentario, type ComentarioAdmin } from "@/services/admin.service";

export function ComentariosTabela() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<ComentarioAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "comentarios", pagina],
    queryFn: () => listarComentarios({ page: pagina, limit: 10 }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerComentario(id),
    onSuccess: () => {
      toast.success("Comentário removido.");
      queryClient.invalidateQueries({ queryKey: ["admin", "comentarios"] });
      setAlvo(null);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const comentarios = data?.comentarios ?? [];

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
        <p className="text-sm text-muted-foreground">Não foi possível carregar os comentários.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (comentarios.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <MessageSquare className="size-8" aria-hidden="true" />
        <p className="text-sm">Nenhum comentário encontrado.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Autor</TableHead>
            <TableHead>Comentário</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comentarios.map((comentario) => (
            <TableRow key={comentario.id}>
              <TableCell className="font-medium">{comentario.usuario?.nome ?? "—"}</TableCell>
              <TableCell className="max-w-96 truncate">{comentario.comentario}</TableCell>
              <TableCell>
                <StatusBadge tom={comentario.ativo === false ? "perigo" : "sucesso"}>
                  {comentario.ativo === false ? "Removido" : "Ativo"}
                </StatusBadge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={comentario.ativo === false}
                  onClick={() => setAlvo(comentario)}
                  aria-label="Remover comentário"
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
        titulo="Remover comentário"
        descricao="Esta ação não pode ser desfeita. O comentário será removido permanentemente."
        textoConfirmar="Remover"
        destrutivo
        carregando={remover.isPending}
        onConfirmar={() => alvo && remover.mutate(alvo.id)}
      />
    </div>
  );
}
