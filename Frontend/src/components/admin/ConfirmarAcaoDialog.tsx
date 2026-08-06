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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** AlertDialog reutilizável para confirmar ações administrativas destrutivas. */
export function ConfirmarAcaoDialog({
  trigger,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  destrutivo = false,
  onConfirmar,
}: {
  trigger: ReactNode;
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  destrutivo?: boolean;
  onConfirmar: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmar}
            className={destrutivo ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
