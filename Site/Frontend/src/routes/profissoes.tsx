import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { DicionarioDeProfissoes } from "@/components/profissoes/DicionarioDeProfissoes";

export const Route = createFileRoute("/profissoes")({
  head: () => ({
    meta: [
      { title: "Dicionário de profissões — ACESSO" },
      { name: "description", content: "Veja o que cada profissão faz: atividades, ferramentas, habilidades e um exemplo de rotina, em linguagem simples." },
    ],
  }),
  component: ProfissoesPagina,
});

function ProfissoesPagina() {
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">Dicionário de profissões</h1>
      <p className="mt-2 text-muted-foreground">Descubra o que cada profissão faz no dia a dia, com ferramentas, habilidades e um exemplo de rotina. Você pode ouvir cada ficha em voz alta.</p>
      <DicionarioDeProfissoes />
    </EstruturaApp>
  );
}
