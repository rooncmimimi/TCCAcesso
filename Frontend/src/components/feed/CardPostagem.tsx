import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, MoreVertical, Share2, ThumbsUp, Undo2 } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { formatarTempoRelativo } from "@/utils/format";
import type { PostagemCompleta } from "@/types";
import { LinkAutor } from "@/components/perfil/LinkAutor";
import { DialogCompartilhar } from "./DialogCompartilhar";
import { GaleriaAnexos } from "./GaleriaAnexos";
import { SecaoComentarios } from "./SecaoComentarios";
import {
  useAlternarCurtida,
  useAtualizarPostagem,
  useDesfazerCompartilhamento,
  useRemoverPostagem,
} from "./hooks";

/** Publicação do feed: conteúdo, anexos, curtidas, comentários e compartilhamento. */
export function CardPostagem({
  postagem,
  mostrarComentariosAbertos = false,
}: {
  postagem: PostagemCompleta;
  mostrarComentariosAbertos?: boolean;
}) {
  const { user } = useSession();
  const autor = postagem.usuario ?? postagem.autor;
  const ehAutor = autor?.id === user?.id;

  const [editando, setEditando] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState(postagem.conteudo);
  const [comentariosAbertos, setComentariosAbertos] = useState(mostrarComentariosAbertos);

  const curtir = useAlternarCurtida();
  const atualizar = useAtualizarPostagem();
  const remover = useRemoverPostagem();
  const desfazerCompartilhamento = useDesfazerCompartilhamento();

  function salvarEdicao() {
    if (!textoEdicao.trim()) return;
    atualizar.mutate(
      { id: postagem.id, conteudo: textoEdicao.trim() },
      { onSuccess: () => setEditando(false) },
    );
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <article aria-labelledby={`autor-${postagem.id}`}>
          <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <LinkAutor autorId={autor?.id} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-11">
                <AvatarImage src={urlArquivo(autor?.fotoPerfil)} alt="" />
                <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                  {initials(autor?.nome ?? "Usuário")}
                </AvatarFallback>
              </Avatar>
            </LinkAutor>
            <div className="min-w-0">
              <h2 id={`autor-${postagem.id}`} className="truncate text-base font-bold">
                <LinkAutor autorId={autor?.id} className="hover:underline focus-visible:underline">
                  {autor?.nome ?? "Usuário"}
                </LinkAutor>
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {formatarTempoRelativo(postagem.criadoEm ?? postagem.created_at)}
                {postagem.editadoEm ? " · editado" : ""}
              </p>
            </div>
            {ehAutor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label="Mais opções da publicação"
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditando(true)}>Editar</DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A publicação, seus anexos, curtidas e comentários
                          serão removidos permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => remover.mutate(postagem.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          {editando ? (
            <div className="mt-4 space-y-2">
              <label htmlFor={`editar-${postagem.id}`} className="sr-only">
                Editar publicação
              </label>
              <Textarea
                id={`editar-${postagem.id}`}
                value={textoEdicao}
                onChange={(e) => setTextoEdicao(e.target.value)}
                className="min-h-24 resize-none"
              />
              <div className="flex gap-2">
                <Button
                  className="min-h-9"
                  size="sm"
                  onClick={salvarEdicao}
                  disabled={atualizar.isPending || !textoEdicao.trim()}
                >
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-9"
                  onClick={() => {
                    setEditando(false);
                    setTextoEdicao(postagem.conteudo);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{postagem.conteudo}</p>
          )}

          <GaleriaAnexos anexos={postagem.anexos ?? []} />

          <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
            <Button
              variant="ghost"
              className="min-h-11 gap-2"
              aria-pressed={Boolean(postagem.curtidoPorMim)}
              onClick={() => curtir.mutate(postagem.id)}
            >
              <ThumbsUp
                className={`size-4 ${postagem.curtidoPorMim ? "fill-primary text-primary" : ""}`}
                aria-hidden="true"
              />
              Curtir ({postagem.totalCurtidas ?? 0})
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 gap-2"
              aria-expanded={comentariosAbertos}
              onClick={() => setComentariosAbertos((v) => !v)}
            >
              <MessageCircle className="size-4" aria-hidden="true" /> Comentar (
              {postagem.totalComentarios ?? 0})
            </Button>
            {postagem.compartilhadaPorMim ? (
              <Button
                variant="ghost"
                className="min-h-11 gap-2"
                onClick={() =>
                  desfazerCompartilhamento.mutate({ id: postagem.id, postagemId: postagem.id })
                }
              >
                <Undo2 className="size-4" aria-hidden="true" /> Desfazer compartilhamento
              </Button>
            ) : (
              <DialogCompartilhar
                postagemId={postagem.id}
                trigger={
                  <Button variant="ghost" className="min-h-11 gap-2">
                    <Share2 className="size-4" aria-hidden="true" /> Compartilhar (
                    {postagem.totalCompartilhamentos ?? 0})
                  </Button>
                }
              />
            )}
            <Button asChild variant="ghost" className="ml-auto min-h-11">
              <Link to="/postagem/$postagemId" params={{ postagemId: postagem.id }}>
                Ver publicação
              </Link>
            </Button>
          </footer>

          {comentariosAbertos && <SecaoComentarios postagemId={postagem.id} />}
        </article>
      </CardContent>
    </Card>
  );
}

export default CardPostagem;
