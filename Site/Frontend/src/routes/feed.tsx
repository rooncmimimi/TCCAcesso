import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/layouts/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComposerPostagem } from "@/components/feed/ComposerPostagem";
import { CardPostagem } from "@/components/feed/CardPostagem";
import { SugestoesResumo } from "@/components/feed/SugestoesResumo";
import { useFeedInfinito, useFeedTempoReal } from "@/components/feed/hooks";
import { urlArquivo } from "@/services/uploads.service";
import { initials, useSession } from "@/contexts/SessionContext";
import { GuardaAcesso } from "@/components/GuardaAcesso";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — ACESSO" },
      {
        name: "description",
        content: "Acompanhe vagas inclusivas, histórias da comunidade e novidades das empresas parceiras.",
      },
      { property: "og:title", content: "Feed — ACESSO" },
      { property: "og:description", content: "Vagas, comunidade e inclusão em um só lugar." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Feed />
    </GuardaAcesso>
  ),
});

function Feed() {
  const { user } = useSession();
  useFeedTempoReal();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedInfinito({
    limit: 10,
  });

  const postagens = data?.pages.flatMap((pagina) => pagina.dados) ?? [];

  return (
    <AppShell>
      <h1 className="sr-only">Feed da comunidade ACESSO</h1>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">

        <aside aria-label="Seu resumo" className="hidden space-y-4 lg:block">
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <Avatar className="mx-auto size-16">
                <AvatarImage src={urlArquivo(user?.fotoPerfil)} alt="" />
                <AvatarFallback className="bg-primary-soft text-lg font-bold text-primary">
                  {initials(user?.nome ?? "Visitante")}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-3 truncate font-bold">{user?.nome ?? "Visitante"}</h2>
              <p className="text-sm text-muted-foreground">{user?.titulo ?? "Entre para personalizar"}</p>
              <Button asChild variant="secondary" className="mt-4 min-h-11 w-full">
                <Link to="/perfil">Ver meu perfil</Link>
              </Button>
            </CardContent>
          </Card>

          <SugestoesResumo />
        </aside>

        <div className="space-y-4">
          <ComposerPostagem />

          {isLoading && (
            <div className="space-y-4" aria-label="Carregando publicações">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          )}

          {isError && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-destructive">
                Não foi possível carregar o feed. Tente novamente mais tarde.
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && postagens.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Ainda não há publicações. Seja o primeiro a compartilhar algo com a comunidade.
              </CardContent>
            </Card>
          )}

          {!isLoading && postagens.length > 0 && (
            <ul className="space-y-4">
              {postagens.map((postagem) => (
                <li key={postagem.id}>
                  <CardPostagem postagem={postagem} />
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Carregando…" : "Carregar mais"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
