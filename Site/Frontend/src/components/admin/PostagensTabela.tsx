import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Trash2 } from "lucide-react";
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
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { useSession } from "@/lib/session";
import { listarPostagens, removerPostagem, type PostagemAdmin } from "@/services/admin.service";

function formatarData(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

export function PostagensTabela() {
  const { user } = useSession();

  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<PostagemAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "postagens", pagina],
    queryFn: () => listarPostagens({ page: pagina, limit: 10 }),
    enabled: Boolean(user),
  });

  const mutacao = useMutation({
    mutationFn: (postagem: PostagemAdmin) => removerPostagem(postagem.id),
    onSuccess: () => {
      toast.success("Publicação removida.");
      queryClient.invalidateQueries({ queryKey: ["admin", "postagens"] });
      setAlvo(null);
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível remover a publicação."),
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
        <p className="text-sm text-muted-foreground">Não foi possível carregar as publicações.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const postagens = data?.postagens ?? [];

  if (postagens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <FileText className="size-8" aria-hidden="true" />
        <p className="text-sm">Nenhuma publicação encontrada.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Autor</TableHead>
            <TableHead>Conteúdo</TableHead>
            <TableHead>Publicada em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {postagens.map((postagem) => (
            <TableRow key={postagem.id}>
              <TableCell className="font-medium">{postagem.usuario?.nome ?? "—"}</TableCell>
              <TableCell className="max-w-md">
                <p className="line-clamp-2 text-sm text-muted-foreground">{postagem.conteudo}</p>
              </TableCell>
              <TableCell>{formatarData(postagem.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAlvo(postagem)}
                  aria-label={`Remover publicação de ${postagem.usuario?.nome ?? "usuário"}`}
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
        titulo="Remover publicação"
        descricao="Esta ação remove a publicação do feed. Deseja continuar?"
        textoConfirmar="Remover"
        destrutivo
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate(alvo)}
      />
    </div>
  );
}
