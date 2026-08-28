import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Compass, Loader2, UserPlus, Users } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { seguidoresService } from "@/services/empresas.service";
import { extrairMensagemErro } from "@/services/api";
import type { SugestaoEmpresa, SugestaoPerfil } from "@/types";

const CHAVE_PESSOAS = ["descobrir-pessoas"] as const;
const CHAVE_EMPRESAS = ["descobrir-empresas"] as const;

export const Route = createFileRoute("/descobrir")({
  head: () => ({
    meta: [
      { title: "Descobrir — ACESSO" },
      {
        name: "description",
        content: "Encontre pessoas e empresas para seguir no ACESSO, com sugestões explicadas.",
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Descobrir />
    </GuardaAcesso>
  ),
});

function Descobrir() {
  const { user } = useSession();
  const ehCandidato = user?.tipo === "candidato";

  const pessoas = useQuery({
    queryKey: CHAVE_PESSOAS,
    queryFn: () => seguidoresService.sugestoes(12),
  });

  const empresas = useQuery({
    queryKey: CHAVE_EMPRESAS,
    queryFn: () => seguidoresService.sugestoesEmpresas(12),
    enabled: ehCandidato,
  });

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Compass className="size-7 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-extrabold">Descobrir</h1>
      </div>
      <p className="mt-2 text-muted-foreground">
        Sugestões de pessoas e empresas para seguir. Cada sugestão explica por que ela apareceu — nunca usamos
        deficiência, diagnóstico ou outro dado sensível como critério.
      </p>

      <section className="mt-8" aria-labelledby="titulo-pessoas">
        <h2 id="titulo-pessoas" className="flex items-center gap-2 text-xl font-bold">
          <Users className="size-5 text-primary" aria-hidden="true" /> Pessoas
        </h2>
        <div className="mt-4">
          {pessoas.isLoading ? (
            <EstadoCarregando texto="Procurando pessoas para você conhecer…" />
          ) : pessoas.isError ? (
            <EstadoErro onTentar={() => pessoas.refetch()} />
          ) : !pessoas.data || pessoas.data.length === 0 ? (
            <EstadoVazio texto="Sem sugestões de pessoas no momento. Interaja mais no feed para receber sugestões melhores." />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pessoas.data.map((pessoa) => (
                <li key={pessoa.id}>
                  <CartaoPessoa pessoa={pessoa} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {ehCandidato && (
        <section className="mt-10" aria-labelledby="titulo-empresas">
          <h2 id="titulo-empresas" className="flex items-center gap-2 text-xl font-bold">
            <Building2 className="size-5 text-primary" aria-hidden="true" /> Empresas
          </h2>
          <div className="mt-4">
            {empresas.isLoading ? (
              <EstadoCarregando texto="Procurando empresas para você conhecer…" />
            ) : empresas.isError ? (
              <EstadoErro onTentar={() => empresas.refetch()} />
            ) : !empresas.data || empresas.data.length === 0 ? (
              <EstadoVazio texto="Sem sugestões de empresas no momento. Favorite vagas para receber sugestões melhores." />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {empresas.data.map((empresa) => (
                  <li key={empresa.id}>
                    <CartaoEmpresa empresa={empresa} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function EstadoCarregando({ texto }: { texto: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {texto}
    </div>
  );
}

function EstadoErro({ onTentar }: { onTentar: () => void }) {
  return (
    <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
      <p>Não foi possível carregar as sugestões.</p>
      <Button variant="outline" size="sm" onClick={onTentar}>
        Tentar novamente
      </Button>
    </div>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return <p className="py-6 text-sm text-muted-foreground">{texto}</p>;
}

function CartaoPessoa({ pessoa }: { pessoa: SugestaoPerfil }) {
  const queryClient = useQueryClient();

  const seguir = useMutation({
    mutationFn: () => seguidoresService.alternarUsuario(pessoa.id),
    onSuccess: () => {
      toast.success(`Agora você está seguindo ${pessoa.nome}.`);
      queryClient.setQueryData<SugestaoPerfil[]>(CHAVE_PESSOAS, (atual) =>
        atual?.filter((item) => item.id !== pessoa.id),
      );
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível seguir esta pessoa.")),
  });

  return (
    <Card className="h-full shadow-none">
      <CardContent className="flex h-full flex-col items-center gap-3 p-5 text-center">
        <Link to="/perfil/$usuarioId" params={{ usuarioId: pessoa.id }}>
          <Avatar className="size-16">
            <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />
            <AvatarFallback className="bg-primary-soft text-lg font-bold text-primary">
              {initials(pessoa.nome)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0">
          <Link
            to="/perfil/$usuarioId"
            params={{ usuarioId: pessoa.id }}
            className="block truncate font-bold hover:underline focus-visible:underline"
          >
            {pessoa.nome}
          </Link>
          {pessoa.titulo ? <p className="truncate text-sm text-muted-foreground">{pessoa.titulo}</p> : null}
        </div>
        {pessoa.motivo ? (
          <p className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{pessoa.motivo}</p>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="mt-auto min-h-9 w-full gap-2"
          disabled={seguir.isPending}
          onClick={() => seguir.mutate()}
        >
          {seguir.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="size-4" aria-hidden="true" />
          )}
          Seguir
        </Button>
      </CardContent>
    </Card>
  );
}

function CartaoEmpresa({ empresa }: { empresa: SugestaoEmpresa }) {
  const queryClient = useQueryClient();
  const nome = empresa.nomeFantasia ?? empresa.razaoSocial ?? "Empresa";

  const seguir = useMutation({
    mutationFn: () => seguidoresService.alternarEmpresa(empresa.id),
    onSuccess: () => {
      toast.success(`Agora você está seguindo ${nome}.`);
      queryClient.setQueryData<SugestaoEmpresa[]>(CHAVE_EMPRESAS, (atual) =>
        atual?.filter((item) => item.id !== empresa.id),
      );
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível seguir esta empresa.")),
  });

  return (
    <Card className="h-full shadow-none">
      <CardContent className="flex h-full flex-col items-center gap-3 p-5 text-center">
        <Link to="/perfil/$usuarioId" params={{ usuarioId: empresa.usuarioId ?? "" }}>
          <Avatar className="size-16 rounded-md">
            <AvatarImage src={urlArquivo(empresa.logo)} alt="" />
            <AvatarFallback className="rounded-md bg-primary-soft text-lg font-bold text-primary">
              {initials(nome)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0">
          <Link
            to="/perfil/$usuarioId"
            params={{ usuarioId: empresa.usuarioId ?? "" }}
            className="block truncate font-bold hover:underline focus-visible:underline"
          >
            {nome}
          </Link>
          {empresa.setor ? <p className="truncate text-sm text-muted-foreground">{empresa.setor}</p> : null}
        </div>
        {empresa.motivo ? (
          <p className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{empresa.motivo}</p>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="mt-auto min-h-9 w-full gap-2"
          disabled={seguir.isPending}
          onClick={() => seguir.mutate()}
        >
          {seguir.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="size-4" aria-hidden="true" />
          )}
          Seguir
        </Button>
      </CardContent>
    </Card>
  );
}
