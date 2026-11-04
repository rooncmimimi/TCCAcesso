import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { PaginaSimulador } from "@/components/simulador/PaginaSimulador";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de candidatura e entrevista — ACESSO" },
      {
        name: "description",
        content: "Treine uma candidatura e uma entrevista com uma vaga fictícia, no seu ritmo. Nada é enviado a empresas.",
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
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">Simulador de candidatura e entrevista</h1>
      <p className="mt-2 text-muted-foreground">Uma área de treino, com uma vaga inventada. Pratique no seu ritmo, pause quando quiser e repita quantas vezes precisar.</p>
      <PaginaSimulador />
    </EstruturaApp>
  );
}
