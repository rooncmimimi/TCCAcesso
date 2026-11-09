import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { NavegacaoPorObjetivos } from "@/components/objetivos/NavegacaoPorObjetivos";
import { useIdioma } from "@/hooks/useIdioma";

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
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("objetivos.oQueVoceQuerFazer")}</h1>
      <p className="mt-2 text-muted-foreground">{t("objetivos.escolhaUmObjetivoMostramosSoOs")}</p>
      <NavegacaoPorObjetivos />
    </EstruturaApp>
  );
}
