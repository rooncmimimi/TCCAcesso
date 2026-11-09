import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { PaginaSimulador } from "@/components/simulador/PaginaSimulador";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: textoDaPagina("simulador.simuladorDeCandidaturaE2") },
      {
        name: "description",
        content: textoDaPagina("simulador.treineUmaCandidaturaEUma"),
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato"]}>
      <SimuladorPagina />
    </GuardaAcesso>
  ),
});

function SimuladorPagina() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("simulador.simuladorDeCandidaturaE")}</h1>
      <p className="mt-2 text-muted-foreground">{t("simulador.umaAreaDeTreinoComUmaVaga")}</p>
      <PaginaSimulador />
    </EstruturaApp>
  );
}
