import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppWindow, Laptop, Loader2, LogOut, ShieldAlert, Smartphone, Tablet } from "lucide-react";
import type { ComponentType } from "react";

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
import { useIdioma } from "@/hooks/useIdioma";
import { dataHoraCurta, descreverDispositivo, tempoRelativo, type TipoDeDispositivo } from "@/lib/dispositivo";
import { extrairMensagemErro } from "@/services/api";
import { autenticacaoService } from "@/services/autenticacao.service";
import type { SessaoAtiva } from "@/types";

const CHAVE_SESSOES = ["seguranca", "sessoes"] as const;

const ICONES: Record<TipoDeDispositivo, ComponentType<{ className?: string }>> = {
  celular: Smartphone,
  tablet: Tablet,
  computador: Laptop,
  aplicativo: AppWindow,
  desconhecido: Laptop,
};

/** A sessão atual primeiro; depois a de atividade mais recente. */
function ordenar(sessoes: SessaoAtiva[]): SessaoAtiva[] {
  const atividade = (s: SessaoAtiva) => new Date(s.ultimoUsoEm ?? s.criadoEm).getTime() || 0;

  return [...sessoes].sort((a, b) => Number(b.atual) - Number(a.atual) || atividade(b) - atividade(a));
}

/**
 * Seção "Dispositivos e sessões" da página Configurações → Segurança: cada dispositivo conectado à conta, com o que a
 * pessoa precisa para reconhecê-lo (navegador e sistema, IP, quando entrou e a última atividade) e o botão de encerrar.
 *
 * "Entrou em" e "Última atividade" são os verdadeiros quando o servidor tem as datas (`iniciadaEm` e `ultimoUsoEm`); sem
 * elas, cai no `criadoEm`. Encerrar vale na hora: o dispositivo perde o acesso, e não só quando o login expira.
 */
export function SecaoSessoes() {
  const { t } = useIdioma();
  const queryClient = useQueryClient();

  const { data: sessoes, isLoading, isError, refetch } = useQuery({
    queryKey: CHAVE_SESSOES,
    queryFn: () => autenticacaoService.listarSessoes(),
  });

  const atualizar = () => queryClient.invalidateQueries({ queryKey: CHAVE_SESSOES });

  const encerrar = useMutation({
    mutationFn: (id: string) => autenticacaoService.encerrarSessao(id),
    onSuccess: () => {
      toast.success(t("configuracoes.secaoSessoes.sessaoEncerrada"));
      void atualizar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("configuracoes.secaoSessoes.naoFoiPossivelEncerrarASessao"))),
  });

  const encerrarOutras = useMutation({
    mutationFn: () => autenticacaoService.encerrarOutrasSessoes(),
    onSuccess: () => {
      toast.success(t("configuracoes.secaoSessoes.asOutrasSessoesForamEncerradas"));
      void atualizar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("configuracoes.secaoSessoes.naoFoiPossivelEncerrarAsOutras"))),
  });

  const ordenadas = useMemo(() => ordenar(sessoes ?? []), [sessoes]);
  const outrasSessoes = ordenadas.filter((s) => !s.atual);

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-lg">{t("configuracoes.secaoSessoes.dispositivosESessoes")}</CardTitle>
        {outrasSessoes.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={encerrarOutras.isPending}>
                <LogOut className="size-4" aria-hidden="true" /> {t("configuracoes.secaoSessoes.encerrarAsOutras")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("configuracoes.secaoSessoes.encerrarAsOutrasSessoes")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {outrasSessoes.length === 1
                    ? t("configuracoes.secaoSessoes.oOutroDispositivoConectadoASua")
                    : t("configuracoes.secaoSessoes.osOutrosDispositivosConectados", { var1: outrasSessoes.length })}{" "}
                  Esta sessão (a que você está usando) continua ativa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("post.cancelar")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => encerrarOutras.mutate()}>{t("configuracoes.secaoSessoes.encerrarAsOutras")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("configuracoes.secaoSessoes.carregandoSessoes")}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{t("configuracoes.secaoSessoes.naoFoiPossivelCarregarSuas")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("raiz.tentarNovamente")}
            </Button>
          </div>
        ) : ordenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("configuracoes.secaoSessoes.nenhumaSessaoAtivaEncontrada")}</p>
        ) : (
          <ul aria-label={t("configuracoes.secaoSessoes.dispositivosConectadosASua")} className="space-y-2">
            {ordenadas.map((sessao) => {
              const dispositivo = descreverDispositivo(sessao.userAgent);
              const Icone = ICONES[dispositivo.tipo];
              const entrou = sessao.iniciadaEm ?? sessao.criadoEm;
              const ultimaAtividade = sessao.ultimoUsoEm ?? sessao.criadoEm;

              return (
                <li
                  key={sessao.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3"
                >
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary">
                    <Icone className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0">
                    {/* `div`, e não `p`: o selo é um `div`, e um `div` dentro de `p` é HTML inválido. */}
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {dispositivo.rotulo}
                      {sessao.atual && (
                        <Badge variant="secondary" className="font-medium">
                          {t("configuracoes.secaoSessoes.estaSessao")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entrou em {dataHoraCurta(entrou)}
                      {sessao.atual ? (
                        <>{" · "}{t("configuracoes.secaoSessoes.emUsoAgora")}</>
                      ) : (
                        <>
                          {" · "}
                          {t("configuracoes.secaoSessoes.ultimaAtividade")}{" "}
                          <time dateTime={ultimaAtividade} title={dataHoraCurta(ultimaAtividade)}>
                            {tempoRelativo(ultimaAtividade)}
                          </time>
                        </>
                      )}
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
                      aria-label={t("configuracoes.secaoSessoes.encerrarSessaoEmUltima", { var1: dispositivo.rotulo, var2: tempoRelativo(ultimaAtividade) })}
                    >
                      {t("dashboard.vagaEmpresaCard.encerrar")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && !isError && outrasSessoes.length === 0 && ordenadas.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" /> {t("configuracoes.secaoSessoes.nenhumaOutraSessaoAtivaAlem")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
