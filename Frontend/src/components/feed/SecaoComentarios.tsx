import { useState } from "react";
import { Trash2 } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { formatarTempoRelativo } from "@/utils/format";
import type { ComentarioCompleto } from "@/types";
import { useComentarios, useCriarComentario, useRemoverComentario } from "./hooks";

function LinhaComentario({
  comentario,
  postagemId,
  aoResponder,
}: {
  comentario: ComentarioCompleto;
  postagemId: string;
  aoResponder?: (comentario: ComentarioCompleto) => void;
}) {
  const { user } = useSession();
  const autor = comentario.usuario ?? comentario.autor;
  const remover = useRemoverComentario(postagemId);
  const podeExcluir = autor?.id === user?.id;

  return (
    <li>
      <div className="flex gap-3">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={urlArquivo(autor?.fotoPerfil)} alt="" />
          <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
            {initials(autor?.nome ?? "Usuário")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-secondary px-3 py-2">
            <p className="text-sm font-bold">{autor?.nome ?? "Usuário"}</p>
            <p className="text-sm leading-relaxed">{comentario.comentario}</p>
          </div>
          <div className="mt-1 flex items-center gap-3 px-1 text-xs text-muted-foreground">
            <span>{formatarTempoRelativo(comentario.criadoEm ?? comentario.created_at)}</span>
            {aoResponder && (
              <button
                type="button"
                className="min-h-6 font-semibold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => aoResponder(comentario)}
              >
                Responder
              </button>
            )}
            {podeExcluir && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-6 items-center gap-1 font-semibold text-destructive hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label="Excluir comentário"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" /> Excluir
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O comentário será removido permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => remover.mutate(comentario.id)}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {comentario.respostas && comentario.respostas.length > 0 && (
            <ul className="mt-3 space-y-3 border-l border-border pl-4" aria-label="Respostas">
              {comentario.respostas.map((resposta) => (
                <LinhaComentario key={resposta.id} comentario={resposta} postagemId={postagemId} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

/** Lista de comentários (com respostas de 1 nível) e formulário de novo comentário/resposta. */
export function SecaoComentarios({ postagemId }: { postagemId: string }) {
  const { user } = useSession();
  const { data, isLoading, isError } = useComentarios(postagemId);
  const criar = useCriarComentario(postagemId);
  const [texto, setTexto] = useState("");
  const [respondendoA, setRespondendoA] = useState<ComentarioCompleto | null>(null);

  function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!texto.trim()) return;
    criar.mutate(
      { comentario: texto.trim(), comentarioPaiId: respondendoA?.id ?? null },
      {
        onSuccess: () => {
          setTexto("");
          setRespondendoA(null);
        },
      },
    );
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <form onSubmit={aoEnviar} aria-label="Adicionar comentário" className="flex gap-3">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={urlArquivo(user?.fotoPerfil)} alt="" />
          <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
            {initials(user?.nome ?? "Visitante")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {respondendoA && (
            <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              Respondendo a {respondendoA.usuario?.nome ?? respondendoA.autor?.nome}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setRespondendoA(null)}
              >
                cancelar
              </button>
            </p>
          )}
          <label htmlFor={`comentario-${postagemId}`} className="sr-only">
            Escreva um comentário
          </label>
          <Textarea
            id={`comentario-${postagemId}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva um comentário…"
            className="min-h-10 resize-none"
          />
          <Button
            type="submit"
            size="sm"
            className="mt-2 min-h-9"
            disabled={!texto.trim() || criar.isPending}
          >
            {criar.isPending ? "Enviando…" : respondendoA ? "Responder" : "Comentar"}
          </Button>
        </div>
      </form>

      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando comentários…</p>}
      {isError && <p className="mt-4 text-sm text-destructive">Não foi possível carregar os comentários.</p>}
      {!isLoading && !isError && data && data.dados.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
      )}

      {!isLoading && data && data.dados.length > 0 && (
        <ul className="mt-4 space-y-4">
          {data.dados.map((comentario) => (
            <LinhaComentario
              key={comentario.id}
              comentario={comentario}
              postagemId={postagemId}
              aoResponder={setRespondendoA}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default SecaoComentarios;
