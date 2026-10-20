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
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import { autenticacaoService } from "@/services/autenticacao.service";
import { useSessao } from "@/hooks/useSessao";
import { useT } from "@/i18n";

/** Pausar/excluir conta: ambas destrutivas, ambas exigem senha atual e confirmação explícita. */
export function SecaoContaPerigo() {
  const t = useT();
  const tp = t.configuracoes.perigo;
  const { sair } = useSessao();
  const navigate = useNavigate();
  const [abertoPausar, setAbertoPausar] = useState(false);
  const [abertoExcluir, setAbertoExcluir] = useState(false);
  const [senhaPausar, setSenhaPausar] = useState("");
  const [senhaExcluir, setSenhaExcluir] = useState("");

  const pausar = useMutation({
    mutationFn: () => autenticacaoService.pausarConta(senhaPausar),
    onSuccess: async () => {
      toast.success(tp.pausada);
      await sair();
      void navigate({ to: "/entrar" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tp.erroPausar)),
  });

  const excluir = useMutation({
    mutationFn: () => autenticacaoService.excluirConta(senhaExcluir),
    onSuccess: async () => {
      toast.success(tp.excluida);
      await sair();
      void navigate({ to: "/" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tp.erroExcluir)),
  });

  return (
    <Card className="border-destructive/30 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">{tp.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="font-semibold">{tp.pausarTitulo}</p>
            <p className="text-sm text-muted-foreground">
              {tp.pausarTexto}
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
                <PauseCircle className="size-4" aria-hidden="true" /> {tp.pausarTitulo}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{tp.pausarDialogTitulo}</AlertDialogTitle>
                <AlertDialogDescription>
                  {tp.pausarDialogTexto}
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
                  {tp.senhaAtual}
                </Label>
                <PasswordInput
                  id="senha-pausar"
                  autoComplete="current-password"
                  placeholder={tp.senhaAtual}
                  required
                  value={senhaPausar}
                  onChange={(evento) => setSenhaPausar(evento.target.value)}
                />
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel type="button">{t.comum.cancelar}</AlertDialogCancel>
                  <Button type="submit" disabled={pausar.isPending || !senhaPausar} className="min-h-11 gap-2">
                    {pausar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {tp.pausarTitulo}
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4">
          <div>
            <p className="font-semibold text-destructive">{tp.excluirTitulo}</p>
            <p className="text-sm text-muted-foreground">
              {tp.excluirTexto}
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
                <Trash2 className="size-4" aria-hidden="true" /> {tp.excluirTitulo}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{tp.excluirDialogTitulo}</AlertDialogTitle>
                <AlertDialogDescription>
                  {tp.excluirDialogTexto}
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
                  {tp.senhaAtual}
                </Label>
                <PasswordInput
                  id="senha-excluir"
                  autoComplete="current-password"
                  placeholder={tp.senhaAtual}
                  required
                  value={senhaExcluir}
                  onChange={(evento) => setSenhaExcluir(evento.target.value)}
                />
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel type="button">{t.comum.cancelar}</AlertDialogCancel>
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={excluir.isPending || !senhaExcluir}
                    className="min-h-11 gap-2"
                  >
                    {excluir.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    {tp.excluirPermanente}
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
