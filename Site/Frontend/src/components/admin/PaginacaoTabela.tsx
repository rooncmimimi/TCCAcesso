import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

type PaginacaoTabelaProps = {
  pagina: number;
  totalPaginas: number;
  total: number;
  onPaginaChange: (pagina: number) => void;
};

export function PaginacaoTabela({ pagina, totalPaginas, total, onPaginaChange }: PaginacaoTabelaProps) {
  const t = useT();
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {t.admin.comum.paginacao.resumo(pagina, Math.max(totalPaginas, 1), total)}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
          aria-label={t.admin.comum.paginacao.anteriorAria}
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> {t.comum.anterior}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
          aria-label={t.admin.comum.paginacao.proximaAria}
        >
          {t.comum.proxima} <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
