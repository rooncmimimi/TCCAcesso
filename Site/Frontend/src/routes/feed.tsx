import { createFileRoute, Link } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormularioPostagem } from "@/components/feed/FormularioPostagem";
import { PostagemCard } from "@/components/feed/PostagemCard";
import { SugestoesResumo } from "@/components/feed/SugestoesResumo";
import { useFeedInfinito, useFeedTempoReal } from "@/components/feed/hooks";
import { urlArquivo } from "@/utils/arquivos";
import { iniciaisDoNome } from "@/utils/formatacao";
import { useSessao } from "@/hooks/useSessao";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { metaPagina, dic, useT } from "@/i18n";

export const Route = createFileRoute("/feed")({
  head: () => metaPagina(dic().feed.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Feed />
    </GuardaAcesso>
  ),
});

function Feed() {
  const t = useT();
  const tf = t.feed;
  const { usuario } = useSessao();
  useFeedTempoReal();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeedInfinito({
    limit: 10,
  });

  const postagens = data?.pages.flatMap((pagina) => pagina.dados) ?? [];

  return (
    <EstruturaApp>
      <h1 className="sr-only">{tf.tituloSr}</h1>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">

        <aside aria-label={tf.resumoAria} className="hidden space-y-4 lg:block">
          <Card className="shadow-card">
            <CardContent className="p-5 text-center">
              <Avatar className="mx-auto size-16">
                <AvatarImage src={urlArquivo(usuario?.fotoPerfil)} alt="" />
                <AvatarFallback className="bg-primary-soft text-lg font-bold text-primary">
                  {iniciaisDoNome(usuario?.nome ?? t.layout.visitante)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-3 truncate font-bold">{usuario?.nome ?? t.layout.visitante}</h2>
              <p className="text-sm text-muted-foreground">{usuario?.titulo ?? tf.entreParaPersonalizar}</p>
              <Button asChild variant="secondary" className="mt-4 min-h-11 w-full">
                <Link to="/perfil">{tf.verMeuPerfil}</Link>
              </Button>
            </CardContent>
          </Card>

          <SugestoesResumo />
        </aside>

        <div className="space-y-4">
          <FormularioPostagem />

          {isLoading && (
            <div className="space-y-4" aria-label={tf.carregandoAria}>
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          )}

          {isError && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-destructive">
                {tf.erro}
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && postagens.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {tf.vazio}
              </CardContent>
            </Card>
          )}

          {!isLoading && postagens.length > 0 && (
            <ul className="space-y-4">
              {postagens.map((postagem) => (
                <li key={postagem.id}>
                  <PostagemCard postagem={postagem} />
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
                {isFetchingNextPage ? t.comum.carregando : tf.carregarMais}
              </Button>
            </div>
          )}
        </div>
      </div>
    </EstruturaApp>
  );
}
