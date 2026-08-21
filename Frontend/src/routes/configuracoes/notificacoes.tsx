import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import notificacoesService from "@/services/notificacoes.service";
import type { PreferenciasNotificacao } from "@/types";

export const Route = createFileRoute("/configuracoes/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — ACESSO" },
      { name: "description", content: "Escolha quais notificações você quer receber no ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <PreferenciasNotificacaoPagina />
    </GuardaAcesso>
  ),
});

const CHAVE = ["notificacoes", "preferencias"] as const;

const ITENS: { chave: keyof PreferenciasNotificacao; titulo: string; descricao: string }[] = [
  {
    chave: "vagasCandidaturas",
    titulo: "Vagas e candidaturas",
    descricao: "Novas candidaturas recebidas e atualizações de status das suas candidaturas.",
  },
  {
    chave: "mensagens",
    titulo: "Mensagens",
    descricao: "Avisos de novas mensagens no chat.",
  },
  {
    chave: "publicacoesComentarios",
    titulo: "Publicações e comentários",
    descricao: "Curtidas, comentários e compartilhamentos nas suas publicações.",
  },
];

function PreferenciasNotificacaoPagina() {
  const queryClient = useQueryClient();

  const { data: preferencias, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE,
    queryFn: () => notificacoesService.obterPreferencias(),
  });

  const atualizar = useMutation({
    mutationFn: (payload: Partial<PreferenciasNotificacao>) => notificacoesService.atualizarPreferencias(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: CHAVE });
      const anterior = queryClient.getQueryData<PreferenciasNotificacao>(CHAVE);
      queryClient.setQueryData<PreferenciasNotificacao>(CHAVE, (atual) =>
        atual ? { ...atual, ...payload } : atual,
      );
      return { anterior };
    },
    onError: (erro, _payload, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(CHAVE, contexto.anterior);
      toast.error(extrairMensagemErro(erro, "Não foi possível salvar a preferência."));
    },
  });

  return (
    <AppShell>
      <Link
        to="/configuracoes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para configurações
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Bell className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Notificações</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Escolha quais notificações você quer receber. Avisos importantes da sua conta continuam sendo
            enviados mesmo com tudo desligado.
          </p>
        </div>
      </div>

      <Card className="mt-6 shadow-none">
        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando preferências…
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-2 p-5 text-sm text-destructive">
              <p>Não foi possível carregar suas preferências.</p>
              <button type="button" className="font-semibold underline" onClick={() => refetch()}>
                Tentar novamente
              </button>
            </div>
          ) : (
            ITENS.map((item) => (
              <div key={item.chave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
                <div className="min-w-0">
                  <Label htmlFor={`pref-${item.chave}`} className="font-semibold">
                    {item.titulo}
                  </Label>
                  <p className="text-sm text-muted-foreground">{item.descricao}</p>
                </div>
                <Switch
                  id={`pref-${item.chave}`}
                  checked={preferencias?.[item.chave] ?? true}
                  onCheckedChange={(valor) => atualizar.mutate({ [item.chave]: valor })}
                  aria-label={`${item.titulo}${preferencias?.[item.chave] ? ", ativado" : ", desativado"}`}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
