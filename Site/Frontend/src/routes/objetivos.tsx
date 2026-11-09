import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { NavegacaoPorObjetivos } from "@/components/objetivos/NavegacaoPorObjetivos";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/objetivos")({
  head: () => ({
    meta: [
      { title: textoDaPagina("objetivos.oQueVoceQuerFazerAcesso") },
      { name: "description", content: textoDaPagina("objetivos.escolhaUmObjetivoEVejaSoOs") },
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
