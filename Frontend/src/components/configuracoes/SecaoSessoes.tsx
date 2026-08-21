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
import { authService } from "@/services/auth.service";

const CHAVE_SESSOES = ["seguranca", "sessoes"] as const;

function formatarData(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Descrição curta do dispositivo/navegador a partir do user-agent, sem depender de libs novas. */
function descreverDispositivo(userAgent?: string | null): string {
  if (!userAgent) return "Dispositivo desconhecido";
  const ua = userAgent.toLowerCase();
  const navegador = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome/")
      ? "Chrome"
      : ua.includes("firefox/")
        ? "Firefox"
        : ua.includes("safari/")
          ? "Safari"
          : "Navegador";
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
  const queryClient = useQueryClient();

  const { data: sessoes, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE_SESSOES,
    queryFn: () => authService.listarSessoes(),
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: CHAVE_SESSOES });

  const encerrar = useMutation({
    mutationFn: (id: string) => authService.encerrarSessao(id),
    onSuccess: () => {
      toast.success("Sessão encerrada.");
      void atualizar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível encerrar a sessão.")),
  });

  const encerrarOutras = useMutation({
    mutationFn: () => authService.encerrarOutrasSessoes(),
    onSuccess: () => {
      toast.success("As outras sessões foram encerradas.");
      void atualizar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível encerrar as outras sessões.")),
  });

  const outrasSessoes = (sessoes ?? []).filter((s) => !s.atual);

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-lg">Sessões ativas</CardTitle>
        {outrasSessoes.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                <LogOut className="size-4" aria-hidden="true" /> Encerrar as outras
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar as outras sessões?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os outros dispositivos conectados à sua conta precisarão entrar novamente. Esta sessão
                  (a que você está usando agora) continua ativa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => encerrarOutras.mutate()}>Encerrar as outras</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando sessões…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>Não foi possível carregar suas sessões.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : !sessoes || sessoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão ativa encontrada.</p>
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
                        Esta sessão
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ativa desde {formatarData(sessao.criadoEm)}
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
                    aria-label={`Encerrar sessão em ${descreverDispositivo(sessao.userAgent)}`}
                  >
                    Encerrar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && outrasSessoes.length === 0 && sessoes && sessoes.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" /> Nenhuma outra sessão ativa além desta.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
