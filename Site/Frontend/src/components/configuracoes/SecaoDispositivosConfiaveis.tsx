import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MailCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { dataHoraCurta, tempoRelativo } from "@/lib/dispositivo";
import { esquecerDispositivoConfiavel } from "@/services/api";
import { useEstadoDaSeguranca } from "@/hooks/useEstadoDaSeguranca";
import segurancaService, { mensagemDeErroSeguranca, type DispositivoConfiavel } from "@/services/seguranca.service";

const CHAVE_DISPOSITIVOS = ["seguranca", "dispositivos-confiaveis"] as const;

/**
 * Seção "Dispositivos de confiança": os aparelhos em que a pessoa escolheu "Lembrar este dispositivo" ao confirmar o código
 * do e-mail. Neles o login não pede o código por e-mail. Remover um (ou todos) faz o aparelho voltar a pedir; não encerra a
 * sessão que já está aberta (isso é em "Dispositivos e sessões"). Só aparece com o recurso ligado.
 */
export function SecaoDispositivosConfiaveis() {
  const queryClient = useQueryClient();
  const { data: estado } = useEstadoDaSeguranca();

  const { data: dispositivos, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE_DISPOSITIVOS,
    queryFn: () => segurancaService.listarDispositivos(),
    enabled: Boolean(estado?.habilitado),
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: CHAVE_DISPOSITIVOS });

  const remover = useMutation({
    mutationFn: (dispositivo: DispositivoConfiavel) => segurancaService.removerDispositivo(dispositivo.id).then(() => dispositivo),
    onSuccess: (dispositivo) => {
      if (dispositivo.atual) esquecerDispositivoConfiavel();
      toast.success("A confiança neste dispositivo foi removida.");
      void atualizar();
    },
    onError: (erro) => toast.error(mensagemDeErroSeguranca(erro, "Não foi possível remover o dispositivo.")),
  });

  const removerTodos = useMutation({
    mutationFn: () => segurancaService.removerTodosDispositivos(),
    onSuccess: () => {
      esquecerDispositivoConfiavel();
      toast.success("A confiança em todos os dispositivos foi removida.");
      void atualizar();
    },
    onError: (erro) => toast.error(mensagemDeErroSeguranca(erro, "Não foi possível remover os dispositivos.")),
  });

  if (!estado?.habilitado) return null;

  const lista = dispositivos ?? [];

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MailCheck className="size-5" aria-hidden="true" /> Dispositivos de confiança
          </CardTitle>
          <CardDescription>
            {estado.ativo
              ? "Nestes aparelhos não pedimos o código por e-mail ao entrar. Em qualquer outro, a senha sozinha não basta."
              : "A verificação por e-mail está temporariamente inativa neste servidor."}
          </CardDescription>
        </div>
        {lista.length > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={removerTodos.isPending}>
                <Trash2 className="size-4" aria-hidden="true" /> Remover todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover a confiança em todos os dispositivos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os aparelhos voltam a pedir o código enviado por e-mail no próximo login. As sessões abertas continuam.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => removerTodos.mutate()}>Remover todos</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Carregando dispositivos…
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>Não foi possível carregar os dispositivos de confiança.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum dispositivo de confiança. Ao confirmar o código do e-mail num aparelho seu, marque &quot;Lembrar este dispositivo&quot;.
          </p>
        ) : (
          <ul aria-label="Dispositivos de confiança" className="space-y-2">
            {lista.map((dispositivo) => (
              <li key={dispositivo.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {dispositivo.rotulo}
                    {dispositivo.atual && (
                      <Badge variant="secondary" className="font-medium">
                        Este dispositivo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confiável desde {dataHoraCurta(dispositivo.criadoEm)} · último uso{" "}
                    <time dateTime={dispositivo.ultimoUsoEm} title={dataHoraCurta(dispositivo.ultimoUsoEm)}>
                      {tempoRelativo(dispositivo.ultimoUsoEm)}
                    </time>
                    {" · vale até "}
                    {dataHoraCurta(dispositivo.expiraEm)}
                    {dispositivo.ip ? ` · IP ${dispositivo.ip}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={remover.isPending}
                  onClick={() => remover.mutate(dispositivo)}
                  aria-label={`Remover a confiança em ${dispositivo.rotulo}, confiável desde ${dataHoraCurta(dispositivo.criadoEm)}`}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
