import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { ComparadorDeVagasTela } from "@/components/vagas/ComparadorDeVagasTela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: textoDaPagina("comparar.compararVagasAcesso") },
      { name: "description", content: textoDaPagina("comparar.compareAteTresVagasLadoALado") },
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
