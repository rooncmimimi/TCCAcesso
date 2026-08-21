import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { extrairMensagemErro } from "@/services/api";
import { perfilService, type RecursoPerfil } from "@/services/perfil.service";
import { RecursoFormDialog } from "./RecursoFormDialog";
import { linhaPrincipal, linhaSecundaria, type RegistroPerfil as Registro } from "./formatacaoRecurso";

/**
 * Seção genérica de experiências, formações, certificados ou habilidades.
 *
 * Modo edição (padrão, perfil próprio): busca os dados via `perfilService` e
 * permite adicionar/editar/remover. Modo leitura (perfil de outra pessoa):
 * recebe `itens` já carregados (do `perfilCompleto`) e só lista, sem ações —
 * evita duplicar este componente para os dois casos.
 */
export function SecaoRecursoPerfil({
  recurso,
  titulo,
  itens,
  somenteLeitura = false,
}: {
  recurso: RecursoPerfil;
  titulo: string;
  itens?: Registro[];
  somenteLeitura?: boolean;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["perfil-recurso", recurso],
    queryFn: () => perfilService.listarRecurso<Registro>(recurso),
    enabled: !somenteLeitura,
  });

  const lista = somenteLeitura ? itens ?? [] : data;

  const remover = useMutation({
    mutationFn: (id: string) => perfilService.removerRecurso(recurso, id),
    onSuccess: () => {
      toast.success("Registro removido.");
      void queryClient.invalidateQueries({ queryKey: ["perfil-recurso", recurso] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível remover.")),
  });

  if (somenteLeitura && (lista?.length ?? 0) === 0) {
    return null;
  }

  return (
    <section aria-labelledby={`secao-${recurso}`} className="border-t pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`secao-${recurso}`} className="text-lg font-bold">
          {titulo}
        </h2>
        {somenteLeitura ? null : (
          <RecursoFormDialog recurso={recurso}>
            <Button type="button" size="sm" variant="outline" className="min-h-9 gap-1">
              <Plus className="size-4" aria-hidden="true" /> Adicionar
            </Button>
          </RecursoFormDialog>
        )}
      </div>

      {somenteLeitura ? null : isLoading ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando…
        </div>
      ) : isError ? (
        <p role="alert" className="py-3 text-sm text-destructive">
          Não foi possível carregar essa seção.
        </p>
      ) : null}

      {!somenteLeitura && !isLoading && !isError && (!lista || lista.length === 0) ? (
        <p className="py-3 text-sm text-muted-foreground">Nada cadastrado ainda.</p>
      ) : null}

      {lista && lista.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {lista.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="font-semibold">{linhaPrincipal(recurso, item)}</p>
                <p className="text-sm text-muted-foreground">{linhaSecundaria(recurso, item)}</p>
              </div>
              {somenteLeitura ? null : (
                <div className="flex shrink-0 gap-1">
                  <RecursoFormDialog recurso={recurso} registro={item}>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9"
                      aria-label={`Editar ${linhaPrincipal(recurso, item)}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                  </RecursoFormDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-9 text-destructive hover:text-destructive"
                        aria-label={`Remover ${linhaPrincipal(recurso, item)}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover este registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{linhaPrincipal(recurso, item)}" será removido do seu perfil. Essa ação não pode ser
                          desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remover.mutate(item.id)}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
