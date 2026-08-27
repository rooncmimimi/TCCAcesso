import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardPostagem } from "@/components/feed/CardPostagem";
import { usePostagemDetalhe } from "@/components/feed/hooks";
import { GuardaAcesso } from "@/components/GuardaAcesso";

export const Route = createFileRoute("/postagem/$postagemId")({
  head: () => ({
    meta: [
      { title: "Publicação — ACESSO" },
      {
        name: "description",
        content: "Leia a publicação completa, os comentários e participe da conversa na comunidade ACESSO.",
      },
      { property: "og:title", content: "Publicação — ACESSO" },
      { property: "og:description", content: "Publicação da comunidade ACESSO." },
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
  const { postagemId } = Route.useParams();
  const { data: postagem, isLoading, isError, refetch } = usePostagemDetalhe(postagemId);

  return (
    <AppShell>
      <Link
        to="/feed"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para o feed
      </Link>

      <h1 className="sr-only">Publicação</h1>

      {isLoading && <Skeleton className="mt-4 h-64 w-full rounded-xl" />}

      {isError && (
        <div role="alert" className="mt-4 space-y-3 rounded-xl border border-destructive/40 p-6">
          <p className="text-sm">Não foi possível carregar esta publicação.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && !postagem && (
        <p className="mt-4 text-sm text-muted-foreground">Publicação não encontrada ou removida.</p>
      )}

      {postagem && (
        <div className="mt-4">
          <CardPostagem postagem={postagem} mostrarComentariosAbertos />
        </div>
      )}
    </AppShell>
  );
}
