import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, FileText, KeyRound, Lock, MessageSquare, ShieldCheck, UserX } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { EstruturaApp } from "@/layouts/EstruturaApp";
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
import { useSessao } from "@/hooks/useSessao";
import { formatarData } from "@/utils/formatacao";
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
      { title: "Privacidade e Segurança — ACESSO" },
      { name: "description", content: "Controle quem pode ver seu perfil, quem pode falar com você e a segurança da sua conta." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Privacidade />
    </GuardaAcesso>
  ),
});

/** Uma linha de navegação para outra tela do mesmo assunto (ícone, título, explicação e seta). */
function LinhaDeNavegacao({
  to,
  icone: Icone,
  titulo,
  descricao,
}: {
  to: "/configuracoes/bloqueados" | "/configuracoes/senha" | "/configuracoes/seguranca" | "/termos" | "/privacidade";
  icone: ComponentType<{ className?: string }>;
  titulo: string;
  descricao: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 -m-2 hover:bg-secondary"
    >
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
        <Icone className="size-5 text-muted-foreground" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{titulo}</span>
        <span className="block text-sm text-muted-foreground">{descricao}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function Privacidade() {
  const { usuario, atualizar } = useSessao();
  const perfilPublico = usuario?.perfilPublico ?? true;
  const preferenciaMensagens = usuario?.preferenciaMensagens ?? "todos";

  // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a
  // leitura.
  const atualizarPrivacidade = useMutation({
    mutationFn: (valor: boolean) => bloqueioService.atualizarPrivacidade(valor),
    onSuccess: (resultado) => {
      atualizar({ perfilPublico: resultado.perfilPublico });
      toast.success(
        resultado.perfilPublico ? "Seu perfil agora é público." : "Seu perfil agora é privado.",
      );
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível salvar a preferência.")),
  });

  const atualizarMensagens = useMutation({
    mutationFn: (valor: PreferenciaMensagens) => bloqueioService.atualizarPreferenciaMensagens(valor),
    onSuccess: (resultado) => {
      atualizar({ preferenciaMensagens: resultado.preferenciaMensagens });
      toast.success("Preferência de mensagens atualizada.");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível salvar a preferência.")),
  });

  return (
    <EstruturaApp>
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
          <h1 className="text-2xl font-extrabold sm:text-3xl">Privacidade e Segurança</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Controle quem pode ver seu perfil e falar com você, e proteja o acesso à sua conta.
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
              disabled={atualizarPrivacidade.isPending}
              onCheckedChange={(valor) => atualizarPrivacidade.mutate(valor)}
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
          <div className="mt-3">
            <LinhaDeNavegacao
              to="/configuracoes/bloqueados"
              icone={UserX}
              titulo="Usuários bloqueados"
              descricao="Gerencie os usuários que você bloqueou."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Segurança da conta</h2>
          <LinhaDeNavegacao
            to="/configuracoes/senha"
            icone={KeyRound}
            titulo="Alterar senha"
            descricao="Troque a senha da sua conta."
          />
          <LinhaDeNavegacao
            to="/configuracoes/seguranca"
            icone={Lock}
            titulo="Sessões e contas conectadas"
            descricao="Veja onde sua conta está aberta e gerencie o login com o Google."
          />
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Documentos</h2>
          <LinhaDeNavegacao
            to="/termos"
            icone={FileText}
            titulo="Termos de Uso"
            descricao="As regras de uso da plataforma."
          />
          <LinhaDeNavegacao
            to="/privacidade"
            icone={FileText}
            titulo="Aviso de Privacidade"
            descricao="Quais dados coletamos, para quê, e como exercer seus direitos."
          />
          <p className="text-sm text-muted-foreground" data-testid="registro-de-aceite">
            {usuario?.termosAceitosEm
              ? `Você aceitou a versão ${usuario.termosVersao ?? "anterior ao registro de versões"} em ${formatarData(usuario.termosAceitosEm)}.`
              : "Sua conta é anterior ao registro de aceite dos documentos, então não há versão aceita registrada."}
          </p>
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}
