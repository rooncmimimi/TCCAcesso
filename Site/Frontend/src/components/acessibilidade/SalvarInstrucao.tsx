import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useHistoricoInstrucoes } from "@/hooks/useHistoricoInstrucoes";
import { contemInstrucao } from "@/lib/historicoInstrucoes";

/**
 * "Salvar para consultar depois": guarda a explicação no histórico de instruções (só neste
 * navegador). Depois de salva, o botão diz isso e deixa de repetir a ação.
 */
export function SalvarInstrucao({ titulo, texto }: { titulo: string; texto: string }) {
  const { itens, salvar } = useHistoricoInstrucoes();
  const salva = contemInstrucao(itens, { titulo, texto });

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="min-h-11 gap-1.5"
      disabled={salva}
      onClick={() => {
        if (salvar({ titulo, texto })) toast.success("Salvo no seu histórico de instruções.");
        else toast.error("Não foi possível salvar neste navegador.");
      }}
    >
      {salva ? (
        <>
          <BookmarkCheck className="size-4" aria-hidden="true" /> Salvo no histórico
        </>
      ) : (
        <>
          <BookmarkPlus className="size-4" aria-hidden="true" /> Salvar para consultar depois
        </>
      )}
    </Button>
  );
}
