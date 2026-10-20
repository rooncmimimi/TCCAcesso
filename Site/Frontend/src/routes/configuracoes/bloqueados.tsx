import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserX } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extrairMensagemErro } from "@/services/api";
import bloqueioService from "@/services/bloqueio.service";
import { urlArquivo } from "@/utils/arquivos";
import { iniciaisDoNome } from "@/utils/formatacao";
import { metaPagina, dic, useT } from "@/i18n";

export const Route = createFileRoute("/configuracoes/bloqueados")({
  head: () => metaPagina(dic().configuracoes.bloqueados.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <UsuariosBloqueados />
    </GuardaAcesso>
  ),
});

const CHAVE = ["usuarios", "bloqueados"] as const;

function UsuariosBloqueados() {
  const t = useT();
  const tb = t.configuracoes.bloqueados;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE,
    queryFn: () => bloqueioService.listarBloqueados({ limit: 50 }),
  });

  const desbloquear = useMutation({
    mutationFn: (usuarioId: string) => bloqueioService.desbloquear(usuarioId),
    onSuccess: (_dados, usuarioId) => {
      const pessoa = data?.dados.find((u) => u.id === usuarioId);
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(tb.desbloqueado(pessoa?.nome ?? ""));
      void queryClient.invalidateQueries({ queryKey: CHAVE });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tb.erroDesbloquear)),
  });

  const bloqueados = data?.dados ?? [];

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes/privacidade"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t.comum.voltar}
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">{tb.titulo}</h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        {tb.texto}
      </p>

      <Card className="mt-6 shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t.comum.carregando}
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-2 p-5 text-sm text-destructive">
              <p>{tb.erroCarregar}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t.comum.tentarNovamente}
              </Button>
            </div>
          ) : bloqueados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground" role="status">
              <UserX className="size-8" aria-hidden="true" />
              <p className="text-sm">{tb.vazio}</p>
            </div>
          ) : (
            <ul className="divide-y">
              {bloqueados.map((pessoa) => (
                <li key={pessoa.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                  <Avatar className="size-11 shrink-0">
                    {pessoa.fotoPerfil && <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />}
                    <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                      {iniciaisDoNome(pessoa.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 truncate font-semibold">{pessoa.nome}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    disabled={desbloquear.isPending}
                    onClick={() => desbloquear.mutate(pessoa.id)}
                    aria-label={tb.desbloquearAria(pessoa.nome)}
                  >
                    {desbloquear.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      tb.desbloquear
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}
