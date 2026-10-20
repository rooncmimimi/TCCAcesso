import { useRef, useState } from "react";
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
import { useT } from "@/i18n";

/**
 * Menu "•••" do perfil de terceiro: bloquear (com confirmação) e denunciar.
 *
 * `denunciaEntidadeTipo`/`denunciaEntidadeId` são independentes de
 * `alvoUsuarioId`: bloqueio é sempre usuário-a-usuário, mas denunciar um
 * perfil de empresa precisa do id da empresa (entidade própria no
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
  const t = useT();
  const tb = t.perfil.bloquear;
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [denunciando, setDenunciando] = useState(false);
  // Foco volta pra este botão ao fechar os diálogos abaixo (ver comentário
  // em DenunciarDialog.tsx sobre a disputa de foco entre o menu que fecha e
  // o diálogo que abre).
  const gatilhoMenuRef = useRef<HTMLButtonElement>(null);

  // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`, com a mensagem real do backend;
  // falar aqui também duplicaria a leitura.
  const bloquear = useMutation({
    mutationFn: () => bloqueioService.bloquear(alvoUsuarioId),
    onSuccess: () => {
      toast.success(tb.bloqueado(nome));
      setConfirmando(false);
      void navigate({ to: "/feed" });
    },
    onError: (erro) => {
      toast.error(extrairMensagemErro(erro, tb.erro));
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={gatilhoMenuRef}
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label={tb.maisOpcoes}
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onSelect={() => setConfirmando(true)}
          >
            <ShieldOff aria-hidden="true" className="size-4" /> {tb.bloquearUsuario}
          </DropdownMenuItem>
          {denunciaEntidadeId && (
            <DropdownMenuItem className="gap-2" onSelect={() => setDenunciando(true)}>
              <Flag aria-hidden="true" className="size-4" />{" "}
              {denunciaEntidadeTipo === "empresa" ? tb.denunciarEmpresa : tb.denunciarUsuario}
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
          aoFecharDevolverFoco={() => gatilhoMenuRef.current?.focus()}
        />
      )}

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent
          onCloseAutoFocus={(evento) => {
            evento.preventDefault();
            gatilhoMenuRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{tb.titulo(nome)}</AlertDialogTitle>
            <AlertDialogDescription>{tb.texto(nome)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bloquear.isPending}>{t.comum.cancelar}</AlertDialogCancel>
            <AlertDialogAction
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bloquear.isPending}
              onClick={(evento) => {
                evento.preventDefault();
                bloquear.mutate();
              }}
            >
              {bloquear.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {tb.bloquear}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
