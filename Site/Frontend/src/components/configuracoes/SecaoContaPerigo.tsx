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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extrairMensagemErro } from "@/services/api";
import { authService } from "@/services/auth.service";
import { useSession } from "@/contexts/SessionContext";

/** Pausar/excluir conta — ambas destrutivas, ambas exigem senha atual e confirmação explícita. */
export function SecaoContaPerigo() {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const [abertoPausar, setAbertoPausar] = useState(false);
  const [abertoExcluir, setAbertoExcluir] = useState(false);
  const [senhaPausar, setSenhaPausar] = useState("");
  const [senhaExcluir, setSenhaExcluir] = useState("");

  const pausar = useMutation({
    mutationFn: () => authService.pausarConta(senhaPausar),
    onSuccess: async () => {
      toast.success("Conta pausada. Você pode reativá-la a qualquer momento fazendo login novamente.");
      await signOut();
      void navigate({ to: "/entrar" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível pausar a conta.")),
  });

  const excluir = useMutation({
    mutationFn: () => authService.excluirConta(senhaExcluir),
    onSuccess: async () => {
      toast.success("Conta excluída. Sentiremos sua falta.");
      await signOut();
      void navigate({ to: "/" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível excluir a conta.")),
  });

  return (
    <Card className="border-destructive/30 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-destructive">Zona de risco</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="font-semibold">Pausar conta</p>
            <p className="text-sm text-muted-foreground">
              Seu perfil fica indisponível até você entrar novamente e reativar.
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
                <AlertDialogTitle>Pausar sua conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você será desconectado de todos os dispositivos. Para voltar, basta entrar novamente com seu
                  e-mail e senha e confirmar a reativação. Digite sua senha atual para confirmar.
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
                  Senha atual
                </Label>
                <Input
                  id="senha-pausar"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Senha atual"
                  required
                  value={senhaPausar}
                  onChange={(evento) => setSenhaPausar(evento.target.value)}
                />
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
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
            <p className="font-semibold text-destructive">Excluir conta</p>
            <p className="text-sm text-muted-foreground">
              Remove permanentemente seus dados, publicações, candidaturas, conversas e conexões. Não pode ser
              desfeito.
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
                <AlertDialogTitle>Excluir sua conta permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é definitiva. Todos os seus dados — perfil, publicações, candidaturas, conversas e
                  conexões — serão apagados e não poderão ser recuperados. Digite sua senha atual para confirmar.
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
                  Senha atual
                </Label>
                <Input
                  id="senha-excluir"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Senha atual"
                  required
                  value={senhaExcluir}
                  onChange={(evento) => setSenhaExcluir(evento.target.value)}
                />
                <AlertDialogFooter className="pt-2">
                  <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
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
