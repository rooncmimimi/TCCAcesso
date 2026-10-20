import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, MessageSquare, Search, Trash2 } from "lucide-react";
import type { AxiosError } from "axios";

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
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { DetalheComentarioSheet } from "@/components/admin/DetalheComentarioSheet";
import { extrairMensagemErro } from "@/services/api";
import { listarComentarios, removerComentario, type ComentarioAdmin } from "@/services/admin.service";
import { dic, useT } from "@/i18n";

type RespostaLista = Awaited<ReturnType<typeof listarComentarios>>;

function removerDaResposta(atual: RespostaLista | undefined, id: string): RespostaLista | undefined {
  if (!atual) return atual;
  const restantes = atual.comentarios.filter((comentario) => comentario.id !== id);
  return { ...atual, comentarios: restantes, itens: restantes, total: Math.max(atual.total - 1, 0) } as RespostaLista;
}

/** Comentários para moderação, com busca por texto, paginação e remoção. */
export function ComentariosTabela() {
  const t = useT();
  const tc = t.admin.comentarios;
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [termoAplicado, setTermoAplicado] = useState("");
  const [alvo, setAlvo] = useState<ComentarioAdmin | null>(null);
  const [detalhe, setDetalhe] = useState<ComentarioAdmin | null>(null);

  const chaveConsulta = ["admin", "comentarios", pagina, termoAplicado] as const;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: chaveConsulta,
    queryFn: () => listarComentarios({ page: pagina, limit: 10, q: termoAplicado || undefined }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerComentario(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: chaveConsulta });
      const anterior = queryClient.getQueryData<RespostaLista>(chaveConsulta);
      queryClient.setQueryData<RespostaLista>(chaveConsulta, (atual) => removerDaResposta(atual, id));
      return { anterior };
    },
    onSuccess: () => toast.success(dic().admin.comentarios.removido),
    onError: (erro, _id, contexto) => {
      const status = (erro as AxiosError)?.response?.status;

      if (status === 409 || status === 404) {
        const textos = dic().admin.comentarios;
        toast.info(status === 409 ? textos.jaRemovido : textos.naoExiste);
        return;
      }

      if (contexto?.anterior) {
        queryClient.setQueryData(chaveConsulta, contexto.anterior);
      }
      toast.error(extrairMensagemErro(erro, dic().admin.comentarios.erroRemover));
    },
    onSettled: () => {
      setAlvo(null);
      const atual = queryClient.getQueryData<RespostaLista>(chaveConsulta);
      if (atual && atual.comentarios.length === 0 && pagina > 1) {
        setPagina((p) => Math.max(p - 1, 1));
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "comentarios"] });
    },
  });

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    setPagina(1);
    setTermoAplicado(busca.trim());
  }

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
        <p className="text-sm text-muted-foreground">{tc.erro}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <form className="flex flex-wrap items-end gap-3 p-4" onSubmit={buscar}>
        <div className="min-w-56">
          <Label htmlFor="filtro-comentarios">{tc.buscarLabel}</Label>
          <Input
            id="filtro-comentarios"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={tc.buscarPlaceholder}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="min-h-11 gap-1.5">
          <Search className="size-4" aria-hidden="true" /> {t.admin.comum.buscar}
        </Button>
      </form>

      {comentarios.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <MessageSquare className="size-8" aria-hidden="true" />
          <p className="text-sm">{tc.vazio}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.comum.autor}</TableHead>
                <TableHead>{tc.colunas.comentario}</TableHead>
                <TableHead className="text-right">{t.admin.comum.acoes}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comentarios.map((comentario) => (
                <TableRow key={comentario.id}>
                  <TableCell className="font-medium">{comentario.usuario?.nome ?? "—"}</TableCell>
                  <TableCell className="max-w-96 truncate">{comentario.comentario}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetalhe(comentario)}
                        aria-label={tc.verDetalhesAria(comentario.usuario?.nome ?? t.admin.comum.usuarioGenerico)}
                      >
                        <Eye className="size-4" aria-hidden="true" /> {t.admin.comum.verDetalhes}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setAlvo(comentario)}
                        aria-label={tc.removerAria}
                      >
                        <Trash2 className="size-4" aria-hidden="true" /> {t.admin.comum.remover}
                      </Button>
                    </div>
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

      <DetalheComentarioSheet
        comentario={detalhe}
        open={Boolean(detalhe)}
        onOpenChange={(aberto) => !aberto && setDetalhe(null)}
      />

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo={tc.dialogoRemover.titulo}
        descricao={tc.dialogoRemover.texto}
        textoConfirmar={t.admin.comum.remover}
        destrutivo
        carregando={remover.isPending}
        onConfirmar={() => alvo && remover.mutate(alvo.id)}
      />
    </div>
  );
}
