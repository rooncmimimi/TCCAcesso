import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MoreVertical, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extrairMensagemErro } from "@/services/api";
import bloqueioService from "@/services/bloqueio.service";
import { useSpeech } from "@/contexts/SpeechContext";

/** Menu "•••" do perfil de terceiro, com a ação de bloquear (com confirmação). */
export function BloquearUsuarioMenu({ alvoUsuarioId, nome }: { alvoUsuarioId: string; nome: string }) {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [confirmando, setConfirmando] = useState(false);

  const bloquear = useMutation({
    mutationFn: () => bloqueioService.bloquear(alvoUsuarioId),
    onSuccess: () => {
      toast.success(`${nome} foi bloqueado(a).`);
      speak("Usuário bloqueado com sucesso.");
      setConfirmando(false);
      void navigate({ to: "/feed" });
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Não foi possível bloquear este usuário."));
      speak("Não foi possível bloquear este usuário.");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Mais opções">
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onSelect={() => setConfirmando(true)}
          >
            <ShieldOff aria-hidden="true" className="size-4" /> Bloquear usuário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear {nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              {nome} não vai mais conseguir ver seu perfil, seguir você ou enviar mensagens — e o mesmo vale para
              você em relação a {nome}. Você pode desbloquear depois em Configurações → Privacidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bloquear.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bloquear.isPending}
              onClick={(evento) => {
                evento.preventDefault();
                bloquear.mutate();
              }}
            >
              {bloquear.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
