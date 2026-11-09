import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useHistoricoInstrucoes } from "@/hooks/useHistoricoInstrucoes";
import { contemInstrucao } from "@/lib/historicoInstrucoes";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * "Salvar para consultar depois": guarda a explicação no histórico de instruções (só neste
 * navegador). Depois de salva, o botão diz isso e deixa de repetir a ação.
 */
export function SalvarInstrucao({ titulo, texto }: { titulo: string; texto: string }) {
  const { t } = useIdioma();
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
        if (salvar({ titulo, texto })) toast.success(t("acessibilidade.salvarInstrucao.salvoNoSeuHistoricoDe"));
        else toast.error(t("acessibilidade.salvarInstrucao.naoFoiPossivelSalvarNeste"));
      }}
    >
      {salva ? (
        <>
          <BookmarkCheck className="size-4" aria-hidden="true" /> {t("acessibilidade.salvarInstrucao.salvoNoHistorico")}
        </>
      ) : (
        <>
          <BookmarkPlus className="size-4" aria-hidden="true" /> {t("acessibilidade.salvarInstrucao.salvarParaConsultarDepois")}
        </>
      )}
    </Button>
  );
}
