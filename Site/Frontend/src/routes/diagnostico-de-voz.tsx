import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { DiagnosticoDeVoz } from "@/components/diagnostico/DiagnosticoDeVoz";

export const Route = createFileRoute("/diagnostico-de-voz")({
  head: () => ({
    meta: [
      { title: "Diagnóstico de voz — ACESSO" },
      { name: "description", content: "Teste a voz do seu aparelho: se ela informa cada palavra, se a pausa funciona e como é a leitura do ACESSO. Gera um relatório para copiar." },
    ],
  }),
  component: DiagnosticoPagina,
});

function DiagnosticoPagina() {
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">Diagnóstico de voz</h1>
      <p className="mt-2 text-muted-foreground">Descubra o que a voz do seu aparelho consegue fazer: se informa cada palavra para o destaque, se a pausa funciona e como é a leitura do ACESSO. Serve também para testar celulares e navegadores diferentes.</p>
      <DiagnosticoDeVoz />
    </EstruturaApp>
  );
}
