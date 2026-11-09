import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { DicionarioDeProfissoes } from "@/components/profissoes/DicionarioDeProfissoes";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/profissoes")({
  head: () => ({
    meta: [
      { title: textoDaPagina("profissoes.dicionarioDeProfissoesAcesso") },
      { name: "description", content: textoDaPagina("profissoes.vejaOQueCadaProfissaoFaz") },
    ],
  }),
  component: ProfissoesPagina,
});

function ProfissoesPagina() {
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("profissoes.dicionarioDeProfissoes")}</h1>
      <p className="mt-2 text-muted-foreground">{t("profissoes.descubraOQueCadaProfissaoFazNo")}</p>
      <DicionarioDeProfissoes />
    </EstruturaApp>
  );
}
