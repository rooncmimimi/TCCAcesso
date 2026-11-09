import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { ComparadorDeVagasTela } from "@/components/vagas/ComparadorDeVagasTela";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparar vagas — ACESSO" },
      { name: "description", content: "Compare até três vagas lado a lado: ambiente, acessibilidade física e adaptações. Sem notas e sem escolher por você." },
    ],
  }),
  component: CompararPagina,
});

function CompararPagina() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("comparar.compararVagas")}</h1>
      <p className="mt-2 text-muted-foreground">{t("comparar.vejaAteTresVagasLadoALadoE")}</p>
      <ComparadorDeVagasTela />
    </EstruturaApp>
  );
}
