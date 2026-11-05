import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { ComparadorDeVagasTela } from "@/components/vagas/ComparadorDeVagasTela";

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
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">Comparar vagas</h1>
      <p className="mt-2 text-muted-foreground">Veja até três vagas lado a lado e decida com as suas necessidades.</p>
      <ComparadorDeVagasTela />
    </EstruturaApp>
  );
}
