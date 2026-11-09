import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PauseCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useIdioma } from "@/hooks/useIdioma";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import { autenticacaoService } from "@/services/autenticacao.service";
import { useSessao } from "@/hooks/useSessao";
import { AvisoSemSenha } from "./AvisoSemSenha";

/** Pausar/excluir conta: ambas destrutivas, ambas exigem senha atual e confirmação explícita. */
export function SecaoContaPerigo() {
  const { t } = useIdioma();
  const { sair, usuario } = useSessao();
  const navigate = useNavigate();
  const [abertoPausar, setAbertoPausar] = useState(false);
  const [abertoExcluir, setAbertoExcluir] = useState(false);
  const [senhaPausar, setSenhaPausar] = useState("");
  const [senhaExcluir, setSenhaExcluir] = useState("");

  const pausar = useMutation({
    mutationFn: () => autenticacaoService.pausarConta(senhaPausar),
    onSuccess: async () => {
      toast.success("Conta pausada. Você pode reativá-la a qualquer momento fazendo login novamente.");
      await sair();
      void navigate({ to: "/entrar" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível pausar a conta.")),
  });

  const excluir = useMutation({
    mutationFn: () => autenticacaoService.excluirConta(senhaExcluir),
    onSuccess: async () => {
      toast.success("Conta excluída. Sentiremos sua falta.");
      await sair();
      void navigate({ to: "/" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível excluir a conta.")),
  });

  // Conta que entra só pelo Google: pausar e excluir pedem a senha, que ainda não existe.
  if (usuario?.temSenha === false) {
    return (
      <Card className="border-destructive/30 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">{t("configuracoes.secaoContaPerigo.zonaDeRisco")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AvisoSemSenha recurso={t("configuracoes.secaoContaPerigo.pausarOuExcluirAConta")} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">{t("configuracoes.secaoContaPerigo.zonaDeRisco")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="font-semibold">{t("configuracoes.secaoContaPerigo.pausarConta")}</p>
            <p className="text-sm text-muted-foreground">
              {t("configuracoes.secaoContaPerigo.seuPerfilFicaIndisponivelAte")}
            </p>
          </div>
          <AlertDialog
            open={abertoPausar}
            onOpenChange={(valor) => {
              setAbertoPausar(valor);
              if (!valor) setSenhaPausar("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="min-h-11 gap-2">
                <PauseCircle className="size-4" aria-hidden="true" /> Pausar conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("configuracoes.secaoContaPerigo.pausarSuaConta")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("configuracoes.secaoContaPerigo.voceSeraDesconectadoDeTodosOs")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form
                className="space-y-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  pausar.mutate();
                }}
              >
                <Label htmlFor="senha-pausar" className="sr-only">
                  {t("configuracoes.secaoContaPerigo.senhaAtual")}
                </Label>
                <PasswordInput
                  id="senha-pausar"
                  autoComplete="current-password"
                  placeholder={t("configuracoes.secaoContaPerigo.senhaAtual")}
                  required
                  value={senhaPausar}
                  onChange={(evento) => setSenhaPausar(evento.target.value)}
                />
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel type="button">{t("post.cancelar")}</AlertDialogCancel>
                  <Button type="submit" disabled={pausar.isPending || !senhaPausar} className="min-h-11 gap-2">
                    {pausar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Pausar conta
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4">
          <div>
            <p className="font-semibold text-destructive">{t("configuracoes.secaoContaPerigo.excluirConta")}</p>
            <p className="text-sm text-muted-foreground">
              {t("configuracoes.secaoContaPerigo.removePermanentementeSeusDados")}
            </p>
          </div>
          <AlertDialog
            open={abertoExcluir}
            onOpenChange={(valor) => {
              setAbertoExcluir(valor);
              if (!valor) setSenhaExcluir("");
            }}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="min-h-11 gap-2">
                <Trash2 className="size-4" aria-hidden="true" /> Excluir conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("configuracoes.secaoContaPerigo.excluirSuaContaPermanentemente")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("configuracoes.secaoContaPerigo.estaAcaoEDefinitivaTodosOsSeus")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form
                className="space-y-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  excluir.mutate();
                }}
              >
                <Label htmlFor="senha-excluir" className="sr-only">
                  {t("configuracoes.secaoContaPerigo.senhaAtual")}
                </Label>
                <PasswordInput
                  id="senha-excluir"
                  autoComplete="current-password"
                  placeholder={t("configuracoes.secaoContaPerigo.senhaAtual")}
                  required
                  value={senhaExcluir}
                  onChange={(evento) => setSenhaExcluir(evento.target.value)}
                />
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel type="button">{t("post.cancelar")}</AlertDialogCancel>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={excluir.isPending || !senhaExcluir}
                    className="min-h-11 gap-2"
                  >
                    {excluir.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Excluir permanentemente
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
