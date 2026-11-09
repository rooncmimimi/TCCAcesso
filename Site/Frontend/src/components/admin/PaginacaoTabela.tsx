import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdioma } from "@/hooks/useIdioma";

type PaginacaoTabelaProps = {
  pagina: number;
  totalPaginas: number;
  total: number;
  onPaginaChange: (pagina: number) => void;
};

export function PaginacaoTabela({ pagina, totalPaginas, total, onPaginaChange }: PaginacaoTabelaProps) {
  const { t } = useIdioma();
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Página {pagina} de {Math.max(totalPaginas, 1)} · {total} registro{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
          aria-label={t("vagas.paginaAnterior")}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
          aria-label={t("vagas.proximaPagina")}
        >
          Próxima <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
