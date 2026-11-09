import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { DiagnosticoDeVoz } from "@/components/diagnostico/DiagnosticoDeVoz";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/diagnostico-de-voz")({
  head: () => ({
    meta: [
      { title: textoDaPagina("diagnostico-de-voz.testeDaLeituraEmVozAltaAcesso") },
      { name: "description", content: textoDaPagina("diagnostico-de-voz.confiraEmCercaDe1MinutoSeA") },
    ],
  }),
  component: DiagnosticoPagina,
});

function DiagnosticoPagina() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("diagnostico-de-voz.testeDaLeituraEmVozAlta")}</h1>
      <p className="mt-2 text-muted-foreground">{t("diagnostico-de-voz.descubraSeALeituraEmVozAltaDo")}</p>
      <DiagnosticoDeVoz />
    </EstruturaApp>
  );
}
