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
import { useT } from "@/i18n";
import { useCompartilharPostagem } from "./hooks";

function urlDaPostagem(postagemId: string): string {
  return `${window.location.origin}/postagem/${postagemId}`;
}

/** Diálogo de compartilhamento: recompartilhar no ACESSO, copiar link ou usar o compartilhamento nativo do sistema. */
export function CompartilharDialog({ postagemId, trigger }: { postagemId: string; trigger: React.ReactNode }) {
  const t = useT();
  const tc = t.feed.compartilhar;
  const [aberto, setAberto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [linkCopiado, setLinkCopiado] = useState(false);
  const compartilhar = useCompartilharPostagem();

  const podeCompartilharNativo = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(urlDaPostagem(postagemId));
      setLinkCopiado(true);
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(tc.linkCopiado);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      toast.error(tc.erroCopiar);
    }
  }

  async function compartilharNativo() {
    try {
      await navigator.share({
        title: tc.tituloNativo,
        url: urlDaPostagem(postagemId),
      });
    } catch {
      // Usuário cancelou o compartilhamento nativo: não é um erro a reportar.
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tc.titulo}</DialogTitle>
          <DialogDescription>{tc.descricao}</DialogDescription>
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
            {linkCopiado ? tc.linkCopiado : tc.copiarLink}
          </Button>

          {podeCompartilharNativo ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 justify-start gap-2"
              onClick={compartilharNativo}
            >
              <Share2 className="size-4" aria-hidden="true" /> {tc.outrasRedes}
            </Button>
          ) : null}
        </div>

        <div className="mt-2 border-t pt-4">
          <label htmlFor="comentario-compartilhar" className="flex items-center gap-2 text-sm font-medium">
            <Repeat2 className="size-4" aria-hidden="true" /> {tc.noAcesso}
          </label>
          <Textarea
            id="comentario-compartilhar"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={tc.placeholder}
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
            {compartilhar.isPending ? tc.compartilhando : tc.noAcesso}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompartilharDialog;
