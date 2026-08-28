import type { ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2, MessageCircle, Share2 } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { ListaSeguidoresDialog } from "@/components/perfil/ListaSeguidoresDialog";
import { CandidaturasRecentes } from "@/components/dashboard/CandidaturasRecentes";
import { VagasFavoritas } from "@/components/dashboard/VagasFavoritas";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { atividadeService } from "@/services/atividade.service";
import type { InteracaoFeedItem } from "@/types";

export const Route = createFileRoute("/minha-atividade")({
  head: () => ({
    meta: [
      { title: "Minha atividade — ACESSO" },
      {
        name: "description",
        content: "Veja, só você, um resumo das suas candidaturas, vagas favoritas, seguidos e interações no feed.",
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <MinhaAtividade />
    </GuardaAcesso>
  ),
});

function MinhaAtividade() {
  const { user } = useSession();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["minha-atividade"],
    queryFn: () => atividadeService.minha(),
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Minha atividade</h1>
      <p className="mt-2 text-muted-foreground">
        Um resumo da sua presença no ACESSO. Esta página é privada — só você pode vê-la.
      </p>

      {isLoading ? (
        <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando sua atividade…
        </div>
      ) : isError || !data ? (
        <div role="alert" className="mt-8 space-y-2 text-sm text-destructive">
          <p>Não foi possível carregar sua atividade.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {data.ehCandidato && <CandidaturasRecentes />}
          {data.ehCandidato && <VagasFavoritas />}

          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">Pessoas que você segue</CardTitle>
              {user && data.seguindo.pessoas.total > 0 ? (
                <ListaSeguidoresDialog usuarioId={user.id} modo="seguindo" total={data.seguindo.pessoas.total}>
                  <Button variant="ghost" size="sm">
                    Ver tudo
                  </Button>
                </ListaSeguidoresDialog>
              ) : null}
            </CardHeader>
            <CardContent>
              {data.seguindo.pessoas.itens.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Você ainda não segue ninguém.{" "}
                  <Link to="/feed" className="font-medium text-primary underline">
                    Ver o feed
                  </Link>
                </p>
              ) : (
                <ul className="divide-y">
                  {data.seguindo.pessoas.itens.map((pessoa) => (
                    <li key={pessoa.id}>
                      <Link
                        to={pessoa.id === user?.id ? "/perfil" : "/perfil/$usuarioId"}
                        params={pessoa.id === user?.id ? undefined : { usuarioId: pessoa.id }}
                        className="flex items-center gap-3 rounded-lg py-3 hover:bg-secondary focus-visible:bg-secondary"
                      >
                        <Avatar className="size-10 shrink-0">
                          <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />
                          <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                            {initials(pessoa.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="min-w-0 truncate font-semibold">{pessoa.nome}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Empresas que você segue</CardTitle>
            </CardHeader>
            <CardContent>
              {data.seguindo.empresas.itens.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Você ainda não segue nenhuma empresa.{" "}
                  <Link to="/vagas" className="font-medium text-primary underline">
                    Explorar vagas
                  </Link>
                </p>
              ) : (
                <ul className="divide-y">
                  {data.seguindo.empresas.itens.map((vinculo) => {
                    const empresa = vinculo.empresa;
                    const nome = empresa?.nomeFantasia ?? empresa?.razaoSocial ?? "Empresa";
                    return (
                      <li key={vinculo.id}>
                        <Link
                          to="/perfil/$usuarioId"
                          params={{ usuarioId: empresa?.usuarioId ?? "" }}
                          className="flex items-center gap-3 rounded-lg py-3 hover:bg-secondary focus-visible:bg-secondary"
                        >
                          <Avatar className="size-10 shrink-0 rounded-md">
                            <AvatarImage src={urlArquivo(empresa?.logo)} alt="" />
                            <AvatarFallback className="rounded-md bg-primary-soft text-xs font-bold text-primary">
                              {initials(nome)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="min-w-0 truncate font-semibold">{nome}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Suas interações no feed</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-3">
              <ListaInteracao
                titulo="Curtidas"
                icon={Heart}
                itens={data.interacoesFeed.curtidas.itens}
                total={data.interacoesFeed.curtidas.total}
                vazio="Você ainda não curtiu nenhuma publicação."
              />
              <ListaInteracao
                titulo="Comentários"
                icon={MessageCircle}
                itens={data.interacoesFeed.comentarios.itens}
                total={data.interacoesFeed.comentarios.total}
                vazio="Você ainda não comentou em nenhuma publicação."
              />
              <ListaInteracao
                titulo="Compartilhamentos"
                icon={Share2}
                itens={data.interacoesFeed.compartilhamentos.itens}
                total={data.interacoesFeed.compartilhamentos.total}
                vazio="Você ainda não compartilhou nenhuma publicação."
              />
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

/** Uma das três colunas de "Suas interações no feed" (curtidas, comentários, compartilhamentos). */
function ListaInteracao({
  titulo,
  icon: Icon,
  itens,
  total,
  vazio,
}: {
  titulo: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  itens: InteracaoFeedItem[];
  total: number;
  vazio: string;
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="size-4" aria-hidden={true} /> {titulo} ({total})
      </h3>
      {itens.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {itens.map((item) => (
            <li key={item.id}>
              <Link
                to="/postagem/$postagemId"
                params={{ postagemId: item.postagem?.id ?? "" }}
                className="block truncate rounded-md px-2 py-1.5 text-sm hover:bg-secondary focus-visible:bg-secondary"
              >
                {item.postagem?.conteudo?.trim() || "Publicação com anexo"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
