import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { NavegacaoPorObjetivos } from "@/components/objetivos/NavegacaoPorObjetivos";

export const Route = createFileRoute("/objetivos")({
  head: () => ({
    meta: [
      { title: "O que você quer fazer? — ACESSO" },
      { name: "description", content: "Escolha um objetivo e veja só os passos de que você precisa, em ordem." },
    ],
  }),
  component: ObjetivosPagina,
});

function ObjetivosPagina() {
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">O que você quer fazer?</h1>
      <p className="mt-2 text-muted-foreground">Escolha um objetivo. Mostramos só os passos necessários, um depois do outro. Nada é feito por você: cada passo leva à página certa.</p>
      <NavegacaoPorObjetivos />
    </EstruturaApp>
  );
}
