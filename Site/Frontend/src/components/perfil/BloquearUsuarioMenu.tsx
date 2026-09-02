import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, Loader2, MoreVertical, ShieldOff } from "lucide-react";

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
import { DenunciarDialog } from "@/components/moderacao/DenunciarDialog";
import type { EntidadeDenunciaTipo } from "@/services/denuncia.service";

/**
 * Menu "•••" do perfil de terceiro: bloquear (com confirmação) e denunciar.
 *
 * `denunciaEntidadeTipo`/`denunciaEntidadeId` são independentes de
 * `alvoUsuarioId`: bloqueio é sempre usuário-a-usuário, mas denunciar um
 * perfil de EMPRESA precisa do id da empresa (entidade própria no
 * backend), não do usuário dono dela.
 */
export function BloquearUsuarioMenu({
  alvoUsuarioId,
  nome,
  denunciaEntidadeTipo = "usuario",
  denunciaEntidadeId,
}: {
  alvoUsuarioId: string;
  nome: string;
  denunciaEntidadeTipo?: EntidadeDenunciaTipo;
  denunciaEntidadeId?: string;
}) {
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [denunciando, setDenunciando] = useState(false);

  // Fase 9, Bloco 7: os toasts abaixo já são lidos automaticamente por
  // `useAutoSpeech` — falar aqui também duplicava (e, no erro, a fala
  // manual usava um texto genérico fixo em vez da mensagem real do
  // backend que o toast já mostra corretamente).
  const bloquear = useMutation({
    mutationFn: () => bloqueioService.bloquear(alvoUsuarioId),
    onSuccess: () => {
      toast.success(`${nome} foi bloqueado(a).`);
      setConfirmando(false);
      void navigate({ to: "/feed" });
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, "Não foi possível bloquear este usuário."));
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
          {denunciaEntidadeId && (
            <DropdownMenuItem className="gap-2" onSelect={() => setDenunciando(true)}>
              <Flag aria-hidden="true" className="size-4" /> Denunciar{" "}
              {denunciaEntidadeTipo === "empresa" ? "empresa" : "usuário"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {denunciaEntidadeId && (
        <DenunciarDialog
          open={denunciando}
          onOpenChange={setDenunciando}
          entidadeTipo={denunciaEntidadeTipo}
          entidadeId={denunciaEntidadeId}
          nomeExibicao={nome}
        />
      )}

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
