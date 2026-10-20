import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, MessageSquare, ShieldCheck, UserX } from "lucide-react";

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
import type { PreferenciaMensagens } from "@/types";
import { metaPagina, dic, useT } from "@/i18n";

// Os rótulos de cada opção vêm do dicionário (`configuracoes.privacidade.opcoes`).
const OPCOES_PREFERENCIA_MENSAGENS: PreferenciaMensagens[] = [
  "todos",
  "seguidores",
  "seguindo",
  "mutuo",
  "empresas",
  "ninguem",
];

export const Route = createFileRoute("/configuracoes/privacidade")({
  head: () => metaPagina(dic().configuracoes.privacidade.meta),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Privacidade />
    </GuardaAcesso>
  ),
});

function Privacidade() {
  const t = useT();
  const tp = t.configuracoes.privacidade;
  const { usuario, atualizar } = useSessao();
  const perfilPublico = usuario?.perfilPublico ?? true;
  const preferenciaMensagens = usuario?.preferenciaMensagens ?? "todos";

  // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a
  // leitura.
  const atualizarPrivacidade = useMutation({
    mutationFn: (valor: boolean) => bloqueioService.atualizarPrivacidade(valor),
    onSuccess: (resultado) => {
      atualizar({ perfilPublico: resultado.perfilPublico });
      toast.success(resultado.perfilPublico ? tp.agoraPublico : tp.agoraPrivado);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tp.erroPreferencia)),
  });

  const atualizarMensagens = useMutation({
    mutationFn: (valor: PreferenciaMensagens) => bloqueioService.atualizarPreferenciaMensagens(valor),
    onSuccess: (resultado) => {
      atualizar({ preferenciaMensagens: resultado.preferenciaMensagens });
      toast.success(tp.mensagensAtualizada);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tp.erroPreferencia)),
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
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{tp.titulo}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {tp.texto}
          </p>
        </div>
      </div>

      <Card className="mt-6 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">{tp.perfil}</h2>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <Label htmlFor="perfil-publico" className="font-semibold">
                {tp.perfilPublico}
              </Label>
              <p className="text-sm text-muted-foreground">
                {tp.perfilPublicoTexto}
              </p>
            </div>
            <Switch
              id="perfil-publico"
              checked={perfilPublico}
              disabled={atualizarPrivacidade.isPending}
              onCheckedChange={(valor) => atualizarPrivacidade.mutate(valor)}
              aria-label={tp.perfilPublicoAria(perfilPublico)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">{tp.mensagens}</h2>
          <div className="mt-3 space-y-2">
            <Label htmlFor="preferencia-mensagens" className="font-semibold">
              {tp.quemEnvia}
            </Label>
            <p className="text-sm text-muted-foreground">
              {tp.quemEnviaTexto}
            </p>
            <Select
              value={preferenciaMensagens}
              onValueChange={(valor) => atualizarMensagens.mutate(valor as PreferenciaMensagens)}
              disabled={atualizarMensagens.isPending}
            >
              <SelectTrigger id="preferencia-mensagens" className="mt-1 sm:max-w-sm">
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder={tp.selecione} />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_PREFERENCIA_MENSAGENS.map((valor) => (
                  <SelectItem key={valor} value={valor}>
                    {tp.opcoes[valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">{tp.bloqueios}</h2>
          <Link
            to="/configuracoes/bloqueados"
            className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 -m-2 hover:bg-secondary"
          >
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
              <UserX className="size-5 text-muted-foreground" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{tp.usuariosBloqueados}</span>
              <span className="block text-sm text-muted-foreground">{tp.gerencieBloqueados}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </EstruturaApp>
  );
}
