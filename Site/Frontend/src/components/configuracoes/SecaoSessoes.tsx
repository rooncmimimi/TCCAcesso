import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Laptop, Loader2, LogOut, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { extrairMensagemErro } from "@/services/api";
import { autenticacaoService } from "@/services/autenticacao.service";
import { formatarDataHoraCurta } from "@/utils/formatacao";
import { dic, useT } from "@/i18n";

const CHAVE_SESSOES = ["seguranca", "sessoes"] as const;

/** Descrição curta do dispositivo/navegador a partir do user-agent, sem depender de libs novas. */
function descreverDispositivo(userAgent?: string | null): string {
  if (!userAgent) return dic().configuracoes.sessoes.dispositivoDesconhecido;
  const ua = userAgent.toLowerCase();
  const navegador = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome/")
      ? "Chrome"
      : ua.includes("firefox/")
        ? "Firefox"
        : ua.includes("safari/")
          ? "Safari"
          : dic().configuracoes.sessoes.navegador;
  const sistema = ua.includes("android")
    ? "Android"
    : ua.includes("iphone") || ua.includes("ipad")
      ? "iOS"
      : ua.includes("windows")
        ? "Windows"
        : ua.includes("mac os")
          ? "macOS"
          : ua.includes("linux")
            ? "Linux"
            : "";
  return sistema ? `${navegador} · ${sistema}` : navegador;
}

/** Seção "Sessões ativas" da página Configurações → Segurança. */
export function SecaoSessoes() {
  const t = useT();
  const ts = t.configuracoes.sessoes;
  const queryClient = useQueryClient();

  const { data: sessoes, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE_SESSOES,
    queryFn: () => autenticacaoService.listarSessoes(),
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: CHAVE_SESSOES });

  const encerrar = useMutation({
    mutationFn: (id: string) => autenticacaoService.encerrarSessao(id),
    onSuccess: () => {
      toast.success(ts.encerrada);
      void atualizar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, ts.erroEncerrar)),
  });

  const encerrarOutras = useMutation({
    mutationFn: () => autenticacaoService.encerrarOutrasSessoes(),
    onSuccess: () => {
      toast.success(ts.outrasEncerradas);
      void atualizar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, ts.erroEncerrarOutras)),
  });

  const outrasSessoes = (sessoes ?? []).filter((s) => !s.atual);

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-lg">{ts.titulo}</CardTitle>
        {outrasSessoes.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                <LogOut className="size-4" aria-hidden="true" /> {ts.encerrarOutras}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{ts.encerrarOutrasTitulo}</AlertDialogTitle>
                <AlertDialogDescription>
                  {ts.encerrarOutrasTexto}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.comum.cancelar}</AlertDialogCancel>
                <AlertDialogAction onClick={() => encerrarOutras.mutate()}>{ts.encerrarOutras}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {ts.carregando}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{ts.erroCarregar}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t.comum.tentarNovamente}
            </Button>
          </div>
        ) : !sessoes || sessoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{ts.nenhuma}</p>
        ) : (
          <ul className="space-y-2">
            {sessoes.map((sessao) => (
              <li
                key={sessao.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3"
              >
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
                  <Laptop className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {descreverDispositivo(sessao.userAgent)}
                    {sessao.atual && (
                      <Badge variant="secondary" className="font-medium">
                        {ts.estaSessao}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ts.ativaDesde(formatarDataHoraCurta(sessao.criadoEm))}
                    {sessao.ip ? ` · IP ${sessao.ip}` : ""}
                  </p>
                </div>
                {!sessao.atual && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={encerrar.isPending}
                    onClick={() => encerrar.mutate(sessao.id)}
                    aria-label={ts.encerrarAria(descreverDispositivo(sessao.userAgent))}
                  >
                    {ts.encerrar}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && outrasSessoes.length === 0 && sessoes && sessoes.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" /> {ts.nenhumaOutra}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
