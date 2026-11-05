import { PainelDeDitado } from "@/components/acessibilidade/PainelDeDitado";
import { inserirTextoNoCampo } from "@/lib/inserirTextoNoCampo";

/**
 * Ditado para um campo de texto que JÁ existe (identificado pelo `id`), sem trocá-lo: serve para
 * formulários cujo campo é controlado por outro código, por rascunho ou por `FormData`. A inserção
 * dispara o mesmo evento de uma digitação, então o resto do formulário percebe a mudança. Segue a
 * regra do ditado: nada entra no campo antes de a pessoa revisar e confirmar.
 */
export function DitadoParaCampo({ campoId }: { campoId: string }) {
  return (
    <div className="mt-2">
      <PainelDeDitado aoInserir={(texto) => inserirTextoNoCampo(campoId, texto)} />
    </div>
  );
}
