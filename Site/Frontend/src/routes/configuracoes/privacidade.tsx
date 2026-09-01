import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, MessageSquare, ShieldCheck, UserX } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extrairMensagemErro } from "@/services/api";
import bloqueioService from "@/services/bloqueio.service";
import { useSession } from "@/contexts/SessionContext";
import { useSpeech } from "@/contexts/SpeechContext";
import type { PreferenciaMensagens } from "@/types";

const OPCOES_PREFERENCIA_MENSAGENS: { value: PreferenciaMensagens; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "seguidores", label: "Apenas seguidores" },
  { value: "seguindo", label: "Apenas pessoas que você segue" },
  { value: "mutuo", label: "Apenas seguidores que você também segue" },
  { value: "empresas", label: "Apenas empresas" },
  { value: "ninguem", label: "Ninguém" },
];

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
  const { speak, choice } = useSpeech();
  const perfilPublico = user?.perfilPublico ?? true;
  const preferenciaMensagens = user?.preferenciaMensagens ?? "todos";

  const atualizar = useMutation({
    mutationFn: (valor: boolean) => bloqueioService.atualizarPrivacidade(valor),
    onSuccess: (resultado) => {
      update({ perfilPublico: resultado.perfilPublico });
      toast.success(
        resultado.perfilPublico ? "Seu perfil agora é público." : "Seu perfil agora é privado.",
      );
      if (choice === "accepted") {
        speak(resultado.perfilPublico ? "Perfil público ativado." : "Perfil público desativado.");
      }
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível salvar a preferência.")),
  });

  const atualizarMensagens = useMutation({
    mutationFn: (valor: PreferenciaMensagens) => bloqueioService.atualizarPreferenciaMensagens(valor),
    onSuccess: (resultado) => {
      update({ preferenciaMensagens: resultado.preferenciaMensagens });
      const rotulo = OPCOES_PREFERENCIA_MENSAGENS.find((o) => o.value === resultado.preferenciaMensagens)?.label;
      toast.success("Preferência de mensagens atualizada.");
      if (choice === "accepted" && rotulo) {
        speak(`Quem pode mandar mensagem para você: ${rotulo}.`);
      }
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
                Seu nome, foto e informações do perfil continuam visíveis para outras pessoas mesmo
                desativado. O que muda são suas publicações: com o perfil privado, elas só ficam
                visíveis para quem você aprovar como seguidor — outras pessoas veem um botão para
                solicitar seguir você.
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
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Mensagens</h2>
          <div className="mt-3 space-y-2">
            <Label htmlFor="preferencia-mensagens" className="font-semibold">
              Quem pode enviar novas mensagens para você?
            </Label>
            <p className="text-sm text-muted-foreground">
              Essa configuração controla quem pode iniciar novas conversas com você. Usuários
              bloqueados nunca poderão iniciar uma conversa, independentemente desta opção.
            </p>
            <Select
              value={preferenciaMensagens}
              onValueChange={(valor) => atualizarMensagens.mutate(valor as PreferenciaMensagens)}
              disabled={atualizarMensagens.isPending}
            >
              <SelectTrigger id="preferencia-mensagens" className="mt-1 sm:max-w-sm">
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_PREFERENCIA_MENSAGENS.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
