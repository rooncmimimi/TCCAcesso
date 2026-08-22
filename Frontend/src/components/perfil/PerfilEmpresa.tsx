import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, Globe, Loader2, MapPin, Pencil, Users } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/contexts/SessionContext";
import { empresasService, seguidoresService } from "@/services/empresas.service";
import { urlArquivo } from "@/services/uploads.service";
import { EditarEmpresaDialog } from "./EditarEmpresaDialog";
import { SeguirButton } from "./SeguirButton";
import { EnviarMensagemButton } from "./EnviarMensagemButton";
import { BloquearUsuarioMenu } from "./BloquearUsuarioMenu";
import { AvisoAprovacaoEmpresa } from "./AvisoAprovacaoEmpresa";
import { PostagensUsuario } from "./PostagensUsuario";
import { CompartilhamentosUsuario } from "./CompartilhamentosUsuario";

/**
 * Perfil empresarial: dados, vagas abertas, publicações e seguidores da empresa.
 *
 * Sem `usuarioId`: perfil da própria empresa autenticada, editável.
 * Com `usuarioId` de outra empresa: modo leitura pública, com botão de seguir.
 */
export function PerfilEmpresa({ usuarioId }: { usuarioId?: string } = {}) {
  const { user } = useSession();

  const proprioPerfil = !usuarioId || usuarioId === user?.id;

  const { data: minhaEmpresa, isLoading: carregandoMinhaEmpresa, isError: erroMinhaEmpresa } = useQuery({
    queryKey: ["minha-empresa"],
    queryFn: () => empresasService.minhaEmpresa(),
    enabled: proprioPerfil && Boolean(user),
  });

  const { data: empresaAlheia, isLoading: carregandoEmpresaAlheia, isError: erroEmpresaAlheia } = useQuery({
    queryKey: ["perfil-publico-empresa", usuarioId],
    queryFn: () => empresasService.porUsuario(usuarioId as string),
    enabled: !proprioPerfil && Boolean(usuarioId),
    retry: false,
  });

  const empresa = proprioPerfil ? minhaEmpresa : empresaAlheia;
  const isLoading = proprioPerfil ? carregandoMinhaEmpresa : carregandoEmpresaAlheia;
  const isError = proprioPerfil ? erroMinhaEmpresa : erroEmpresaAlheia;

  const aprovada = empresa?.statusAprovacao === "aprovada";

  const { data: vagasProprias, isLoading: carregandoVagasProprias } = useQuery({
    queryKey: ["minhas-vagas-perfil"],
    queryFn: () => empresasService.vagasDaEmpresa({ limit: 10 }),
    enabled: proprioPerfil && aprovada,
  });

  const { data: resumo } = useQuery({
    queryKey: ["resumo-empresa", empresa?.id],
    queryFn: () => seguidoresService.resumoEmpresa(empresa!.id),
    enabled: Boolean(empresa?.id) && aprovada,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div role="status" aria-live="polite" className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando perfil da empresa…
        </div>
      </AppShell>
    );
  }

  if (isError || !empresa) {
    return (
      <AppShell>
        <div role="alert" className="py-10 text-sm text-destructive">
          {proprioPerfil
            ? "Não foi possível carregar os dados da sua empresa. Tente novamente mais tarde."
            : "Este perfil não está disponível."}
        </div>
      </AppShell>
    );
  }

  if (!aprovada) {
    if (!proprioPerfil) {
      // Empresa pendente/reprovada não tem perfil público — não há o que mostrar a terceiros.
      return (
        <AppShell>
          <div role="alert" className="py-10 text-center text-sm text-muted-foreground">
            Este perfil não está disponível.
          </div>
        </AppShell>
      );
    }
    return (
      <AppShell>
        <AvisoAprovacaoEmpresa empresa={empresa} />
      </AppShell>
    );
  }

  const nome = empresa.nomeFantasia || empresa.razaoSocial;
  const local = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");
  const vagas = proprioPerfil ? vagasProprias?.dados : empresa.vagas;
  const carregandoVagas = proprioPerfil && carregandoVagasProprias;

  return (
    <AppShell>
      <Card className="overflow-hidden shadow-card">
        <div
          aria-hidden="true"
          className="h-32 w-full bg-primary bg-cover bg-center sm:h-40"
          style={empresa.capa ? { backgroundImage: `url(${urlArquivo(empresa.capa)})` } : undefined}
        />
        <CardContent className="p-5 sm:p-6">
          <div className="-mt-16 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <Avatar className="size-24 border-4 border-card">
              <AvatarImage src={urlArquivo(empresa.logo)} alt="" />
              <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
                <Building2 className="size-8" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>

            {proprioPerfil ? (
              <EditarEmpresaDialog empresa={empresa}>
                <Button variant="outline" className="min-h-11 shrink-0">
                  <Pencil aria-hidden="true" /> Editar perfil da empresa
                </Button>
              </EditarEmpresaDialog>
            ) : (
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {user?.tipo === "candidato" ? (
                  <EnviarMensagemButton tipo="empresa" alvoId={empresa.id} />
                ) : null}
                <SeguirButton
                  alvoId={empresa.id}
                  tipo="empresa"
                  chaveResumo={["resumo-empresa", empresa.id]}
                />
                <BloquearUsuarioMenu
                  alvoUsuarioId={empresa.usuarioId ?? ""}
                  nome={nome}
                  denunciaEntidadeTipo="empresa"
                  denunciaEntidadeId={empresa.id}
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold">{nome}</h1>
            <StatusBadge tom="sucesso">Aprovada</StatusBadge>
          </div>
          <p className="text-muted-foreground">{empresa.razaoSocial}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {empresa.setor ? <span>{empresa.setor}</span> : null}
            {local ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" aria-hidden="true" /> {local}
              </span>
            ) : null}
            {empresa.site ? (
              <a
                href={empresa.site}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Globe className="size-4" aria-hidden="true" /> Site
              </a>
            ) : null}
            <span className="flex items-center gap-1">
              <Users className="size-4" aria-hidden="true" /> {resumo?.totalSeguidores ?? 0} seguidores
            </span>
          </div>
        </CardContent>
      </Card>

      {empresa.descricao || empresa.culturaInclusiva ? (
        <Card className="mt-4 shadow-card">
          <CardContent className="space-y-4 p-5 sm:p-6">
            {empresa.descricao ? (
              <div>
                <h2 className="text-lg font-bold">Sobre a empresa</h2>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{empresa.descricao}</p>
              </div>
            ) : null}
            {empresa.culturaInclusiva ? (
              <div>
                <h2 className="text-lg font-bold">Cultura de inclusão</h2>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{empresa.culturaInclusiva}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">Vagas publicadas</h2>
          {carregandoVagas ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando vagas…
            </div>
          ) : !vagas || vagas.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma vaga publicada ainda.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {vagas.map((vaga) => (
                <li key={vaga.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/vaga/$vagaId"
                      params={{ vagaId: vaga.id }}
                      className="font-semibold hover:underline focus-visible:underline"
                    >
                      {vaga.titulo}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {vaga.cidade ?? "Local não informado"} · {vaga.modalidade}
                    </p>
                  </div>
                  <Badge variant={vaga.status === "Aberta" ? "default" : "secondary"} className="shrink-0 font-medium">
                    {vaga.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <Tabs defaultValue="publicacoes">
            <TabsList>
              <TabsTrigger value="publicacoes">Publicações</TabsTrigger>
              <TabsTrigger value="compartilhamentos">Compartilhamentos</TabsTrigger>
            </TabsList>
            <TabsContent value="publicacoes">
              <PostagensUsuario usuarioId={empresa.usuarioId ?? ""} />
            </TabsContent>
            <TabsContent value="compartilhamentos">
              <CompartilhamentosUsuario usuarioId={empresa.usuarioId ?? ""} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AppShell>
  );
}
