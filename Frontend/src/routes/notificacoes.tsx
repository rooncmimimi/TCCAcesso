import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Briefcase, CheckCheck, Trash2, Users } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import notificacoesService from "@/services/notificacoes.service";
import { extrairMensagemErro } from "@/services/api";
import { ouvirEvento } from "@/services/socket";
import { formatarTempoRelativo } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/types";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — ACESSO" },
      {
        name: "description",
        content:
          "Acompanhe candidaturas, vagas compatíveis e novidades da sua rede na plataforma ACESSO.",
      },
      { property: "og:title", content: "Notificações — ACESSO" },
      { property: "og:description", content: "Novidades sobre suas candidaturas e vagas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaNotificacoes,
});

function iconeDe(tipo: string) {
  const chave = String(tipo).toLowerCase();
  if (chave.includes("candidat") || chave.includes("vaga")) return Briefcase;
  if (chave.includes("segui") || chave.includes("rede")) return Users;
  return Bell;
}

function dataDe(notificacao: Notificacao & { created_at?: string }) {
  return notificacao.criadoEm ?? notificacao.created_at ?? "";
}

function PaginaNotificacoes() {
  return (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Notificacoes />
    </GuardaAcesso>
  );
}

function Notificacoes() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => notificacoesService.listar({ limit: 30 }),
  });

  useEffect(() => {
    return ouvirEvento("notificacao:nova", () => {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
    });
  }, [queryClient]);

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  const marcarUma = useMutation({
    mutationFn: (id: string) => notificacoesService.marcarComoLida(id),
    onSuccess: invalidar,
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const marcarTodas = useMutation({
    mutationFn: () => notificacoesService.marcarTodas(),
    onSuccess: () => {
      toast.success("Todas as notificações foram marcadas como lidas.");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const remover = useMutation({
    mutationFn: (id: string) => notificacoesService.remover(id),
    onSuccess: () => {
      toast.success("Notificação removida.");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const notificacoes = data?.dados ?? [];
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Notificações</h1>
          <p className="mt-1 text-muted-foreground" role="status" aria-live="polite">
            {isLoading
              ? "Carregando…"
              : naoLidas > 0
                ? `${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`
                : "Nenhuma notificação não lida."}
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={naoLidas === 0 || marcarTodas.isPending}
          onClick={() => marcarTodas.mutate()}
        >
          <CheckCheck className="size-4" aria-hidden="true" /> Marcar todas como lidas
        </Button>
      </div>

      {isLoading && (
        <ul className="mt-6 space-y-3" aria-label="Carregando notificações">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <div role="alert" className="mt-6 space-y-3 rounded-xl border border-destructive/40 p-6">
          <p className="text-sm">Não foi possível carregar suas notificações.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && notificacoes.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border p-10 text-center text-muted-foreground">
          <BellOff className="size-8" aria-hidden="true" />
          <p className="text-sm">Você ainda não tem notificações.</p>
        </div>
      )}

      {notificacoes.length > 0 && (
        <ul className="mt-6 space-y-3">
          {notificacoes.map((n) => {
            const Icon = iconeDe(n.tipo);
            return (
              <li key={n.id}>
                <Card
                  className={cn("shadow-none", !n.lida && "border-primary/40 bg-primary-soft/30")}
                >
                  <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className={cn("font-bold", !n.lida && "text-primary")}>{n.titulo}</p>
                      {n.mensagem && <p className="text-sm text-muted-foreground">{n.mensagem}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatarTempoRelativo(dataDe(n))}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!n.lida && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-11"
                          aria-label={`Marcar "${n.titulo}" como lida`}
                          disabled={marcarUma.isPending}
                          onClick={() => marcarUma.mutate(n.id)}
                        >
                          <CheckCheck className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 text-destructive"
                        aria-label={`Remover "${n.titulo}"`}
                        disabled={remover.isPending}
                        onClick={() => remover.mutate(n.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
