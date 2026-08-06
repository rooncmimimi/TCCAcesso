import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCompartilharPostagem } from "./hooks";

/** Diálogo para compartilhar uma publicação, com comentário opcional. */
export function DialogCompartilhar({ postagemId, trigger }: { postagemId: string; trigger: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [comentario, setComentario] = useState("");
  const compartilhar = useCompartilharPostagem();

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar publicação</DialogTitle>
          <DialogDescription>Você pode adicionar um comentário opcional ao compartilhar.</DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="comentario-compartilhar" className="text-sm font-medium">
            Comentário (opcional)
          </label>
          <Textarea
            id="comentario-compartilhar"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="O que você achou dessa publicação?"
            className="mt-1 resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            className="min-h-11"
            disabled={compartilhar.isPending}
            onClick={() =>
              compartilhar.mutate(
                { postagemId, comentario: comentario.trim() || undefined },
                {
                  onSuccess: () => {
                    setAberto(false);
                    setComentario("");
                  },
                },
              )
            }
          >
            {compartilhar.isPending ? "Compartilhando…" : "Compartilhar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DialogCompartilhar;
