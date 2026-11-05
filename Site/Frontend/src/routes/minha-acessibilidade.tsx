import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { PaginaMinhaAcessibilidade } from "@/components/minha-acessibilidade/PaginaMinhaAcessibilidade";

export const Route = createFileRoute("/minha-acessibilidade")({
  head: () => ({
    meta: [
      { title: "Minha Acessibilidade — ACESSO" },
      {
        name: "description",
        content: "Registre, só para você, as adaptações que ajudam nos processos seletivos e escolha, candidatura por candidatura, o que compartilhar.",
      },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato"]}>
      <MinhaAcessibilidadePagina />
    </GuardaAcesso>
  ),
});

function MinhaAcessibilidadePagina() {
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">Minha Acessibilidade</h1>
      <p className="mt-2 text-muted-foreground">
        Um lugar privado para dizer o que ajuda você a participar de processos seletivos. Você decide o que compartilhar, a cada candidatura.
      </p>
      <PaginaMinhaAcessibilidade />
    </EstruturaApp>
  );
}
