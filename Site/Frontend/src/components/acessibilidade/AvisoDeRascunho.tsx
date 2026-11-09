import { FileClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { haQuantoTempo, type Rascunho } from "@/lib/rascunhoDeFormulario";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Aviso de rascunho encontrado, com as duas saídas: restaurar ou descartar. Nunca preenche sozinho:
 * a pessoa decide.
 */
export function AvisoDeRascunho({
  rascunho,
  aoRestaurar,
  aoDescartar,
}: {
  rascunho: Rascunho | null;
  aoRestaurar: () => void;
  aoDescartar: () => void;
}) {
  const { t } = useIdioma();
  if (!rascunho) return null;

  return (
    <div role="group" aria-label={t("acessibilidade.avisoDeRascunho.rascunhoEncontrado")} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <FileClock className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        Você começou a escrever aqui e não terminou ({haQuantoTempo(rascunho.salvoEm)}). Quer continuar de onde parou?
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="min-h-11" onClick={aoRestaurar}>
          Restaurar
        </Button>
        <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={aoDescartar}>
          Descartar
        </Button>
      </div>
    </div>
  );
}
