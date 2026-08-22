import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, ShieldCheck, UserX } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import bloqueioService from "@/services/bloqueio.service";
import { useSession } from "@/contexts/SessionContext";
import { useSpeech } from "@/contexts/SpeechContext";

export const Route = createFileRoute("/configuracoes/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade — ACESSO" },
      { name: "description", content: "Controle quem pode ver seu perfil e gerencie usuários bloqueados." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Privacidade />
    </GuardaAcesso>
  ),
});

function Privacidade() {
  const { user, update } = useSession();
  const { speak } = useSpeech();
  const perfilPublico = user?.perfilPublico ?? true;

  const atualizar = useMutation({
    mutationFn: (valor: boolean) => bloqueioService.atualizarPrivacidade(valor),
    onSuccess: (resultado) => {
      update({ perfilPublico: resultado.perfilPublico });
      toast.success(
        resultado.perfilPublico ? "Seu perfil agora é público." : "Seu perfil agora é privado.",
      );
      speak(resultado.perfilPublico ? "Perfil público ativado." : "Perfil público desativado.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível salvar a preferência.")),
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
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Privacidade</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Controle quem pode ver seu perfil e gerencie quem você bloqueou.
          </p>
        </div>
      </div>

      <Card className="mt-6 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Perfil</h2>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <Label htmlFor="perfil-publico" className="font-semibold">
                Perfil público
              </Label>
              <p className="text-sm text-muted-foreground">
                Quem pode encontrar e visualizar seu perfil. Desativado, só você continua vendo seu próprio
                perfil — outras pessoas veem uma mensagem de perfil indisponível.
              </p>
            </div>
            <Switch
              id="perfil-publico"
              checked={perfilPublico}
              disabled={atualizar.isPending}
              onCheckedChange={(valor) => atualizar.mutate(valor)}
              aria-label={`Perfil público, ${perfilPublico ? "ativado" : "desativado"}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Bloqueios</h2>
          <Link
            to="/configuracoes/bloqueados"
            className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 -m-2 hover:bg-secondary"
          >
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
              <UserX className="size-5 text-muted-foreground" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">Usuários bloqueados</span>
              <span className="block text-sm text-muted-foreground">Gerencie os usuários que você bloqueou.</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
