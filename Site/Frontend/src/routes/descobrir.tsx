import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Building2, Compass, Loader2, MapPin, UserPlus, Users } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { SeguirButton } from "@/components/perfil/SeguirButton";
import { initials, useSession } from "@/contexts/SessionContext";
import { urlArquivo } from "@/services/uploads.service";
import { seguidoresService } from "@/services/empresas.service";
import { extrairMensagemErro } from "@/services/api";
import type { SugestaoEmpresa, SugestaoPerfil } from "@/types";

/**
 * Mesma chave de query usada pelo perfil (`PerfilPessoal.tsx`) para o
 * resumo de seguidores de um usuário — chave COMPARTILHADA de propósito:
 * `SeguirButton` só lê o cache (nunca busca sozinho), então usar a mesma
 * chave aqui garante uma única interpretação do estado de relacionamento
 * em todo o app (perfil, notificações e `/descobrir` nunca divergem), e
 * ainda aproveita o cache já quente se o usuário passou por um desses
 * lugares antes (Fase 9, Bloco 5).
 */
const chaveResumoUsuario = (usuarioId: string) => ["perfil-resumo-seguidores", usuarioId] as const;

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
  // Popula a MESMA chave de cache que `SeguirButton` lê — é essa busca que
  // faz o botão saber se o perfil é público/privado, se já segue, se tem
  // solicitação pendente ou se está bloqueado, sem duplicar nenhuma dessas
  // regras aqui (Fase 9, Bloco 5). `sugestoesPessoas` já nunca sugere
  // alguém bloqueado nem alguém que a pessoa já segue — só falta o estado
  // de privacidade/solicitação, que só o resumo individual traz hoje.
  useQuery({
    queryKey: chaveResumoUsuario(pessoa.id),
    queryFn: () => seguidoresService.resumo(pessoa.id),
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
        <SeguirButton
          alvoId={pessoa.id}
          tipo="usuario"
          chaveResumo={chaveResumoUsuario(pessoa.id)}
          className="mt-auto w-full min-h-9"
        />
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
          <span className="flex items-center justify-center gap-1">
            <Link
              to="/perfil/$usuarioId"
              params={{ usuarioId: empresa.usuarioId ?? "" }}
              className="block truncate font-bold hover:underline focus-visible:underline"
            >
              {nome}
            </Link>
            {empresa.empresaVerificada && (
              <span className="inline-flex shrink-0 items-center text-primary" title="Empresa verificada pelo ACESSO">
                <BadgeCheck className="size-4" aria-hidden="true" />
                <span className="sr-only">Empresa verificada</span>
              </span>
            )}
          </span>
          {empresa.setor ? <p className="truncate text-sm text-muted-foreground">{empresa.setor}</p> : null}
          {empresa.cidade ? (
            <p className="flex items-center justify-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" /> {empresa.cidade}
            </p>
          ) : null}
        </div>
        {empresa.descricao ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{empresa.descricao}</p>
        ) : null}
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
