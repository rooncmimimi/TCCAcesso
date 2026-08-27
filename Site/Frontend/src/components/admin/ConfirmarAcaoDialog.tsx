import type { ReactNode } from "react";
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmarAcaoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  textoConfirmar?: string;
  destrutivo?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
};

/**
 * Diálogo de confirmação reutilizável para ações administrativas
 * sensíveis (aprovar/reprovar, bloquear/desbloquear, moderar).
 */
export function ConfirmarAcaoDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  destrutivo = false,
  carregando = false,
  onConfirmar,
}: ConfirmarAcaoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={carregando}
            onClick={(event) => {
              event.preventDefault();
              onConfirmar();
            }}
            className={cn(destrutivo && buttonVariants({ variant: "destructive" }))}
          >
            {carregando ? "Aguarde…" : textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
