import { useRef, useState } from "react";
import { useIdioma } from "@/hooks/useIdioma";
import { ControleDeTraducao } from "@/components/traducao/ControleDeTraducao";
import { useTraducao } from "@/hooks/useTraducao";
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
import { iniciaisDoNome } from "@/utils/formatacao";
import { useSessao } from "@/hooks/useSessao";
import { urlArquivo } from "@/utils/arquivos";
import { formatarTempoRelativo } from "@/utils/formatacao";
import type { PostagemCompleta } from "@/types";
import { LinkAutor } from "@/components/perfil/LinkAutor";
import { DenunciarDialog } from "@/components/moderacao/DenunciarDialog";
import { CompartilharDialog } from "./CompartilharDialog";
import { GaleriaAnexos } from "./GaleriaAnexos";
import { SecaoComentarios } from "./SecaoComentarios";
import {
  useAlternarCurtida,
  useAtualizarPostagem,
  useDesfazerCompartilhamento,
  useRemoverPostagem,
} from "./hooks";

/** Publicação do feed: conteúdo, anexos, curtidas, comentários e compartilhamento. */
export function PostagemCard({
  postagem,
  mostrarComentariosAbertos = false,
}: {
  postagem: PostagemCompleta;
  mostrarComentariosAbertos?: boolean;
}) {
  const { usuario } = useSessao();
  const { t, locale } = useIdioma();
  const autor = postagem.usuario ?? postagem.autor;
  const nomeDoAutor = autor?.nome ?? t("post.usuario");
  const ehAutor = autor?.id === usuario?.id;

  const traducao = useTraducao({ conteudo: postagem.conteudo });
  const [editando, setEditando] = useState(false);
  const [textoEdicao, setTextoEdicao] = useState(postagem.conteudo);
  const [comentariosAbertos, setComentariosAbertos] = useState(mostrarComentariosAbertos);
  const [denunciando, setDenunciando] = useState(false);
  // Foco volta pra este botão ao fechar o DenunciarDialog (ver comentário
  // em DenunciarDialog.tsx sobre a disputa de foco entre o menu que fecha e
  // o diálogo que abre).
  const gatilhoMenuRef = useRef<HTMLButtonElement>(null);

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
            <LinkAutor
              autorId={autor?.id}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              ariaLabel={t("post.verPerfilDe", { nome: nomeDoAutor })}
            >
              <Avatar className="size-11">
                <AvatarImage src={urlArquivo(autor?.fotoPerfil)} alt="" />
                <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                  {iniciaisDoNome(nomeDoAutor)}
                </AvatarFallback>
              </Avatar>
            </LinkAutor>
            <div className="min-w-0">
              <h2 id={`autor-${postagem.id}`} className="truncate text-base font-bold">
                <LinkAutor autorId={autor?.id} className="hover:underline focus-visible:underline">
                  {nomeDoAutor}
                </LinkAutor>
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {formatarTempoRelativo(postagem.criadoEm ?? postagem.criadoEm, locale)}
                {postagem.editadoEm ? ` · ${t("post.editado")}` : ""}
              </p>
            </div>
            {usuario && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    ref={gatilhoMenuRef}
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={t("post.maisOpcoes")}
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ehAutor ? (
                    <>
                      <DropdownMenuItem onSelect={() => setEditando(true)}>{t("post.editar")}</DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            {t("post.excluir")}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("post.excluirTitulo")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("post.excluirTexto")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="min-h-11">{t("post.cancelar")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => remover.mutate(postagem.id)}
                            >
                              {t("post.excluir")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDenunciando(true)}
                    >
                      {t("post.denunciar")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          {!ehAutor && (
            <DenunciarDialog
              open={denunciando}
              onOpenChange={setDenunciando}
              entidadeTipo="postagem"
              entidadeId={postagem.id}
              nomeExibicao={autor?.nome}
              autorUsuarioId={autor?.id}
              aoFecharDevolverFoco={() => gatilhoMenuRef.current?.focus()}
            />
          )}

          {editando ? (
            <div className="mt-4 space-y-2">
              <label htmlFor={`editar-${postagem.id}`} className="sr-only">
                {t("post.editarRotulo")}
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
                  {t("post.salvar")}
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
            <>
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{traducao.texto("conteudo")}</p>
              {postagem.conteudo.trim() && <ControleDeTraducao traducao={traducao} conteudo="publicacao" />}
            </>
          )}

          <GaleriaAnexos anexos={postagem.anexos ?? []} postagemId={postagem.id} editavel={ehAutor} />

          <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
            <Button
              variant="ghost"
              className="min-h-11 gap-2"
              aria-pressed={Boolean(postagem.curtidoPorMim)}
              aria-label={t(postagem.curtidoPorMim ? "post.descurtirRotulo" : "post.curtirRotulo", { nome: nomeDoAutor, n: postagem.totalCurtidas ?? 0 })}
              onClick={() => curtir.mutate(postagem.id)}
            >
              <ThumbsUp
                className={`size-4 ${postagem.curtidoPorMim ? "fill-primary text-primary" : ""}`}
                aria-hidden="true"
              />
              <span aria-hidden="true">{t("post.curtir")} ({postagem.totalCurtidas ?? 0})</span>
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 gap-2"
              aria-expanded={comentariosAbertos}
              aria-label={t(comentariosAbertos ? "post.fecharComentarios" : "post.abrirComentarios", { n: postagem.totalComentarios ?? 0 })}
              onClick={() => setComentariosAbertos((v) => !v)}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              <span aria-hidden="true">
                {t("post.comentar")} ({postagem.totalComentarios ?? 0})
              </span>
            </Button>
            {postagem.compartilhadaPorMim ? (
              <Button
                variant="ghost"
                className="min-h-11 gap-2"
                aria-label={t("post.desfazerCompartilhamentoRotulo")}
                onClick={() =>
                  desfazerCompartilhamento.mutate({ id: postagem.id, postagemId: postagem.id })
                }
              >
                <Undo2 className="size-4" aria-hidden="true" />
                <span aria-hidden="true">{t("post.desfazerCompartilhamento")}</span>
              </Button>
            ) : (
              <CompartilharDialog
                postagemId={postagem.id}
                trigger={
                  <Button
                    variant="ghost"
                    className="min-h-11 gap-2"
                    aria-label={t("post.compartilharRotulo", { nome: nomeDoAutor, n: postagem.totalCompartilhamentos ?? 0 })}
                  >
                    <Share2 className="size-4" aria-hidden="true" />
                    <span aria-hidden="true">
                      {t("post.compartilhar")} ({postagem.totalCompartilhamentos ?? 0})
                    </span>
                  </Button>
                }
              />
            )}
            <Button asChild variant="ghost" className="ml-auto min-h-11">
              <Link
                to="/postagem/$postagemId"
                params={{ postagemId: postagem.id }}
                aria-label={t("post.verPublicacaoRotulo", { nome: nomeDoAutor })}
              >
                {t("post.verPublicacao")}
              </Link>
            </Button>
          </footer>

          {comentariosAbertos && <SecaoComentarios postagemId={postagem.id} />}
        </article>
      </CardContent>
    </Card>
  );
}

export default PostagemCard;
