import type { ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Loader2, MessageCircle, Share2 } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { ListaSeguidoresDialog } from "@/components/perfil/ListaSeguidoresDialog";
import { CandidaturasRecentes } from "@/components/dashboard/CandidaturasRecentes";
import { VagasFavoritas } from "@/components/dashboard/VagasFavoritas";
import { iniciaisDoNome } from "@/utils/formatacao";
import { useSessao } from "@/hooks/useSessao";
import { urlArquivo } from "@/utils/arquivos";
import { atividadeService } from "@/services/atividade.service";
import { dic, metaPagina, useT } from "@/i18n";
import type { InteracaoFeedItem } from "@/types";

export const Route = createFileRoute("/minha-atividade")({
  head: () => metaPagina(dic().atividade.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <MinhaAtividade />
    </GuardaAcesso>
  ),
});

function MinhaAtividade() {
  const t = useT();
  const ta = t.atividade;
  const { usuario } = useSessao();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["minha-atividade"],
    queryFn: () => atividadeService.minha(),
  });

  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{ta.titulo}</h1>
      <p className="mt-2 text-muted-foreground">
        {ta.intro}
      </p>

      {isLoading ? (
        <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {ta.carregando}
        </div>
      ) : isError || !data ? (
        <div role="alert" className="mt-8 space-y-2 text-sm text-destructive">
          <p>{ta.erro}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t.comum.tentarNovamente}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {data.ehCandidato && <CandidaturasRecentes />}
          {data.ehCandidato && <VagasFavoritas />}

          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">{ta.pessoasSeguidas}</CardTitle>
              {usuario && data.seguindo.pessoas.total > 0 ? (
                <ListaSeguidoresDialog usuarioId={usuario.id} modo="seguindo" total={data.seguindo.pessoas.total}>
                  <Button variant="ghost" size="sm">
                    {ta.verTudo}
                  </Button>
                </ListaSeguidoresDialog>
              ) : null}
            </CardHeader>
            <CardContent>
              {data.seguindo.pessoas.itens.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  {ta.nenhumaPessoa}{" "}
                  <Link to="/feed" className="font-medium text-primary underline">
                    {ta.verFeed}
                  </Link>
                </p>
              ) : (
                <ul className="divide-y">
                  {data.seguindo.pessoas.itens.map((pessoa) => (
                    <li key={pessoa.id}>
                      <Link
                        to={pessoa.id === usuario?.id ? "/perfil" : "/perfil/$usuarioId"}
                        params={pessoa.id === usuario?.id ? undefined : { usuarioId: pessoa.id }}
                        className="flex items-center gap-3 rounded-lg py-3 hover:bg-secondary focus-visible:bg-secondary"
                      >
                        <Avatar className="size-10 shrink-0">
                          <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />
                          <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary">
                            {iniciaisDoNome(pessoa.nome)}
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
              <CardTitle className="text-lg">{ta.empresasSeguidas}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.seguindo.empresas.itens.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  {ta.nenhumaEmpresa}{" "}
                  <Link to="/vagas" className="font-medium text-primary underline">
                    {ta.explorarVagas}
                  </Link>
                </p>
              ) : (
                <ul className="divide-y">
                  {data.seguindo.empresas.itens.map((vinculo) => {
                    const empresa = vinculo.empresa;
                    const nome = empresa?.nomeFantasia ?? empresa?.razaoSocial ?? ta.empresaFallback;
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
                              {iniciaisDoNome(nome)}
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
              <CardTitle className="text-lg">{ta.interacoes}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-3">
              <ListaInteracao
                titulo={ta.curtidas}
                icon={Heart}
                itens={data.interacoesFeed.curtidas.itens}
                total={data.interacoesFeed.curtidas.total}
                vazio={ta.semCurtidas}
              />
              <ListaInteracao
                titulo={ta.comentarios}
                icon={MessageCircle}
                itens={data.interacoesFeed.comentarios.itens}
                total={data.interacoesFeed.comentarios.total}
                vazio={ta.semComentarios}
              />
              <ListaInteracao
                titulo={ta.compartilhamentos}
                icon={Share2}
                itens={data.interacoesFeed.compartilhamentos.itens}
                total={data.interacoesFeed.compartilhamentos.total}
                vazio={ta.semCompartilhamentos}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </EstruturaApp>
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
  const semTexto = useT().atividade.publicacaoComAnexo;

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
                {item.postagem?.conteudo?.trim() || semTexto}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
