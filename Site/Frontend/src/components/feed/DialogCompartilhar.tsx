import { useState } from "react";
import { Check, Copy, Repeat2, Share2 } from "lucide-react";
import { toast } from "sonner";

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
import { useSpeech } from "@/contexts/SpeechContext";
import { useCompartilharPostagem } from "./hooks";

/** Monta a URL pública e navegável de uma publicação (compatível com as rotas existentes). */
export function urlDaPostagem(postagemId: string): string {
  return `${window.location.origin}/postagem/${postagemId}`;
}

/** Diálogo de compartilhamento: recompartilhar no ACESSO, copiar link ou usar o compartilhamento nativo do sistema. */
export function DialogCompartilhar({ postagemId, trigger }: { postagemId: string; trigger: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [linkCopiado, setLinkCopiado] = useState(false);
  const compartilhar = useCompartilharPostagem();
  const { speak } = useSpeech();

  const podeCompartilharNativo = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlDaPostagem(postagemId));
      setLinkCopiado(true);
      toast.success("Link copiado!");
      speak("Link copiado.");
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function compartilharNativo() {
    try {
      await navigator.share({
        title: "Publicação no ACESSO",
        url: urlDaPostagem(postagemId),
      });
    } catch {
      // Usuário cancelou o compartilhamento nativo — não é um erro a reportar.
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar publicação</DialogTitle>
          <DialogDescription>Recompartilhe no ACESSO, copie o link ou envie por outro aplicativo.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 justify-start gap-2"
            onClick={copiarLink}
          >
            {linkCopiado ? (
              <Check className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {linkCopiado ? "Link copiado!" : "Copiar link"}
          </Button>

          {podeCompartilharNativo ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 justify-start gap-2"
              onClick={compartilharNativo}
            >
              <Share2 className="size-4" aria-hidden="true" /> Compartilhar em outras redes
            </Button>
          ) : null}
        </div>

        <div className="mt-2 border-t pt-4">
          <label htmlFor="comentario-compartilhar" className="flex items-center gap-2 text-sm font-medium">
            <Repeat2 className="size-4" aria-hidden="true" /> Compartilhar no ACESSO
          </label>
          <Textarea
            id="comentario-compartilhar"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="O que você achou dessa publicação? (opcional)"
            className="mt-2 resize-none"
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
            {compartilhar.isPending ? "Compartilhando…" : "Compartilhar no ACESSO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DialogCompartilhar;
