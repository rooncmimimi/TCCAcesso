import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostagemCard } from "@/components/feed/PostagemCard";
import { usePostagemDetalhe } from "@/components/feed/hooks";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { metaPagina, dic, useT } from "@/i18n";

export const Route = createFileRoute("/postagem/$postagemId")({
  head: () => ({
    meta: [
      ...metaPagina(dic().feed.postagemMeta).meta,
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <DetalhePostagem />
    </GuardaAcesso>
  ),
});

function DetalhePostagem() {
  const t = useT();
  const tf = t.feed;
  const { postagemId } = Route.useParams();
  const { data: postagem, isLoading, isError, refetch } = usePostagemDetalhe(postagemId);

  return (
    <EstruturaApp>
      <Link
        to="/feed"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {tf.voltarFeed}
      </Link>

      <h1 className="sr-only">{tf.publicacao}</h1>

      {isLoading && <Skeleton className="mt-4 h-64 w-full rounded-xl" />}

      {isError && (
        <div role="alert" className="mt-4 space-y-3 rounded-xl border border-destructive/40 p-6">
          <p className="text-sm">{tf.erroPostagem}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t.comum.tentarNovamente}
          </Button>
        </div>
      )}

      {!isLoading && !isError && !postagem && (
        <p className="mt-4 text-sm text-muted-foreground">{tf.postagemNaoEncontrada}</p>
      )}

      {postagem && (
        <div className="mt-4">
          <PostagemCard postagem={postagem} mostrarComentariosAbertos />
        </div>
      )}
    </EstruturaApp>
  );
}
