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
import { useIdioma } from "@/hooks/useIdioma";
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
  const { t } = useIdioma();
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
      toast.success(t("configuracoes.secaoDispositivosConfiaveis.aConfiancaNesteDispositivoFoi"));
      void atualizar();
    },
    onError: (erro) => toast.error(mensagemDeErroSeguranca(erro, t("configuracoes.secaoDispositivosConfiaveis.naoFoiPossivelRemoverO"))),
  });

  const removerTodos = useMutation({
    mutationFn: () => segurancaService.removerTodosDispositivos(),
    onSuccess: () => {
      esquecerDispositivoConfiavel();
      toast.success(t("configuracoes.secaoDispositivosConfiaveis.aConfiancaEmTodosOs"));
      void atualizar();
    },
    onError: (erro) => toast.error(mensagemDeErroSeguranca(erro, t("configuracoes.secaoDispositivosConfiaveis.naoFoiPossivelRemoverOs"))),
  });

  if (!estado?.habilitado) return null;

  const lista = dispositivos ?? [];

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MailCheck className="size-5" aria-hidden="true" /> {t("configuracoes.secaoDispositivosConfiaveis.dispositivosDeConfianca")}
          </CardTitle>
          <CardDescription>
            {estado.ativo
              ? t("configuracoes.secaoDispositivosConfiaveis.nestesAparelhosNaoPedimosO")
              : t("configuracoes.secaoDispositivosConfiaveis.aVerificacaoPorEMailEsta")}
          </CardDescription>
        </div>
        {lista.length > 1 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={removerTodos.isPending}>
                <Trash2 className="size-4" aria-hidden="true" /> {t("configuracoes.secaoDispositivosConfiaveis.removerTodos")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("configuracoes.secaoDispositivosConfiaveis.removerAConfiancaEmTodosOs")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("configuracoes.secaoDispositivosConfiaveis.todosOsAparelhosVoltamAPedirO")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("post.cancelar")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => removerTodos.mutate()}>{t("configuracoes.secaoDispositivosConfiaveis.removerTodos")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("configuracoes.secaoDispositivosConfiaveis.carregandoDispositivos")}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{t("configuracoes.secaoDispositivosConfiaveis.naoFoiPossivelCarregarOs")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("raiz.tentarNovamente")}
            </Button>
          </div>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum dispositivo de confiança. Ao confirmar o código do e-mail num aparelho seu, marque &quot;Lembrar este dispositivo&quot;.
          </p>
        ) : (
          <ul aria-label={t("configuracoes.secaoDispositivosConfiaveis.dispositivosDeConfianca")} className="space-y-2">
            {lista.map((dispositivo) => (
              <li key={dispositivo.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {dispositivo.rotulo}
                    {dispositivo.atual && (
                      <Badge variant="secondary" className="font-medium">
                        {t("configuracoes.secaoDispositivosConfiaveis.esteDispositivo")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("configuracoes.secaoDispositivosConfiaveis.confiavelDesdeUltimoUso", { data: dataHoraCurta(dispositivo.criadoEm) })}{" "}
                    <time dateTime={dispositivo.ultimoUsoEm} title={dataHoraCurta(dispositivo.ultimoUsoEm)}>
                      {tempoRelativo(dispositivo.ultimoUsoEm)}
                    </time>
                    {" · "}
                    {t("configuracoes.secaoDispositivosConfiaveis.valeAte")}{" "}
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
                  aria-label={t("configuracoes.secaoDispositivosConfiaveis.removerAConfiancaEmConfiavel", { var1: dispositivo.rotulo, var2: dataHoraCurta(dispositivo.criadoEm) })}
                >
                  {t("acessibilidade.paineisDeAjuda.remover")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
