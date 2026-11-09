import { useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LIMITE_DE_VAGAS } from "@/lib/comparadorDeVagas";
import { adicionarNaComparacao, assinarComparacao, fotoDaComparacao, removerDaComparacao } from "@/lib/listaDeComparacao";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Botão "Comparar" da página da vaga: põe a vaga na lista (até 3) que a tela /comparar mostra lado a
 * lado. Só guarda no navegador; não escolhe vaga por ninguém.
 */
export function BotaoComparar({ vagaId }: { vagaId: string }) {
  const { t } = useIdioma();
  const foto = useSyncExternalStore(assinarComparacao, fotoDaComparacao, () => "");
  const ids = foto ? foto.split(",") : [];
  const naLista = ids.includes(vagaId);

  function alternar() {
    if (naLista) {
      removerDaComparacao(vagaId);
      toast.success(t("vagas.botaoComparar.vagaTiradaDaComparacao"));

      return;
    }

    const resultado = adicionarNaComparacao(vagaId);

    if (resultado === "lista-cheia") toast.error(t("vagas.botaoComparar.voceJaEscolheuVagasTireUmaPara", { var1: LIMITE_DE_VAGAS }));
    else toast.success(t("vagas.botaoComparar.vagaIncluidaNaComparacao"));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" className="min-h-11" aria-pressed={naLista} onClick={alternar}>
        <Scale className="size-4" aria-hidden="true" />
        {naLista ? "Tirar da comparação" : t("vagas.botaoComparar.compararEstaVaga")}
      </Button>
      {ids.length > 0 ? (
        <Link to="/comparar" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">
          Ver comparação ({ids.length} de {LIMITE_DE_VAGAS})
        </Link>
      ) : null}
    </div>
  );
}
