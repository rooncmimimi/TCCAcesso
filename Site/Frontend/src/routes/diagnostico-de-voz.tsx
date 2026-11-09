import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { DiagnosticoDeVoz } from "@/components/diagnostico/DiagnosticoDeVoz";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/diagnostico-de-voz")({
  head: () => ({
    meta: [
      { title: "Teste da leitura em voz alta — ACESSO" },
      { name: "description", content: "Confira, em cerca de 1 minuto, se a leitura em voz alta do ACESSO marca as palavras e se Pausar e Continuar funcionam no seu aparelho." },
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
