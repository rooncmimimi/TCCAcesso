import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserX } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extrairMensagemErro } from "@/services/api";
import bloqueioService from "@/services/bloqueio.service";
import { urlArquivo } from "@/services/uploads.service";
import { initials } from "@/contexts/SessionContext";
import { useSpeech } from "@/contexts/SpeechContext";

export const Route = createFileRoute("/configuracoes/bloqueados")({
  head: () => ({
    meta: [
      { title: "Usuários bloqueados — ACESSO" },
      { name: "description", content: "Gerencie os usuários que você bloqueou no ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <UsuariosBloqueados />
    </GuardaAcesso>
  ),
});

const CHAVE = ["usuarios", "bloqueados"] as const;

function UsuariosBloqueados() {
  const queryClient = useQueryClient();
  const { speak } = useSpeech();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE,
    queryFn: () => bloqueioService.listarBloqueados({ limit: 50 }),
  });

  const desbloquear = useMutation({
    mutationFn: (usuarioId: string) => bloqueioService.desbloquear(usuarioId),
    onSuccess: (_dados, usuarioId) => {
      const pessoa = data?.dados.find((u) => u.id === usuarioId);
      toast.success(pessoa ? `${pessoa.nome} foi desbloqueado(a).` : "Usuário desbloqueado.");
      speak("Usuário desbloqueado com sucesso.");
      void queryClient.invalidateQueries({ queryKey: CHAVE });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível desbloquear este usuário.")),
  });

  const bloqueados = data?.dados ?? [];

  return (
    <AppShell>
      <Link
        to="/configuracoes/privacidade"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Usuários bloqueados</h1>
      <p className="text-sm text-muted-foreground sm:text-base">
        Pessoas e empresas que não podem ver seu perfil, seguir você ou enviar mensagens.
      </p>

      <Card className="mt-6 shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando…
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-2 p-5 text-sm text-destructive">
              <p>Não foi possível carregar sua lista de bloqueados.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : bloqueados.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground" role="status">
              <UserX className="size-8" aria-hidden="true" />
              <p className="text-sm">Você não bloqueou ninguém.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {bloqueados.map((pessoa) => (
                <li key={pessoa.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                  <Avatar className="size-11 shrink-0">
                    {pessoa.fotoPerfil && <AvatarImage src={urlArquivo(pessoa.fotoPerfil)} alt="" />}
                    <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                      {initials(pessoa.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 truncate font-semibold">{pessoa.nome}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    disabled={desbloquear.isPending}
                    onClick={() => desbloquear.mutate(pessoa.id)}
                    aria-label={`Desbloquear ${pessoa.nome}`}
                  >
                    {desbloquear.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      "Desbloquear"
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
