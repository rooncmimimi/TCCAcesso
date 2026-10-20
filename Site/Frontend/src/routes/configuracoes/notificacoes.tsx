import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import notificacoesService from "@/services/notificacoes.service";
import type { PreferenciasNotificacao } from "@/types";
import { metaPagina, dic, useT } from "@/i18n";

export const Route = createFileRoute("/configuracoes/notificacoes")({
  head: () => metaPagina(dic().configuracoes.notificacoes.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <PreferenciasNotificacaoPagina />
    </GuardaAcesso>
  ),
});

const CHAVE = ["notificacoes", "preferencias"] as const;

// Títulos e descrições vêm do dicionário (`configuracoes.notificacoes.itens`).
const ITENS = ["vagasCandidaturas", "mensagens", "publicacoesComentarios"] as const satisfies readonly (keyof PreferenciasNotificacao)[];

function PreferenciasNotificacaoPagina() {
  const t = useT();
  const tn = t.configuracoes.notificacoes;
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
      toast.error(extrairMensagemErro(erro, tn.erroSalvar));
    },
  });

  return (
    <EstruturaApp>
      <Link
        to="/configuracoes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t.configuracoes.voltarParaConfiguracoes}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Bell className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{tn.titulo}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {tn.texto}
          </p>
        </div>
      </div>

      <Card className="mt-6 shadow-none">
        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div role="status" aria-live="polite" className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {tn.carregando}
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-2 p-5 text-sm text-destructive">
              <p>{tn.erroCarregar}</p>
              <button type="button" className="font-semibold underline" onClick={() => refetch()}>
                {t.comum.tentarNovamente}
              </button>
            </div>
          ) : (
            ITENS.map((chave) => (
              <div key={chave} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
                <div className="min-w-0">
                  <Label htmlFor={`pref-${chave}`} className="font-semibold">
                    {tn.itens[chave].titulo}
                  </Label>
                  <p className="text-sm text-muted-foreground">{tn.itens[chave].descricao}</p>
                </div>
                <Switch
                  id={`pref-${chave}`}
                  checked={preferencias?.[chave] ?? true}
                  onCheckedChange={(valor) => atualizar.mutate({ [chave]: valor })}
                  aria-label={`${tn.itens[chave].titulo}${preferencias?.[chave] ? tn.ativado : tn.desativado}`}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}
