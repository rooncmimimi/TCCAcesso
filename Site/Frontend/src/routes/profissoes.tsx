import { createFileRoute } from "@tanstack/react-router";

import { EstruturaApp } from "@/layouts/EstruturaApp";
import { DicionarioDeProfissoes } from "@/components/profissoes/DicionarioDeProfissoes";
import { useIdioma } from "@/hooks/useIdioma";

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
  const { t } = useIdioma();
  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("profissoes.dicionarioDeProfissoes")}</h1>
      <p className="mt-2 text-muted-foreground">{t("profissoes.descubraOQueCadaProfissaoFazNo")}</p>
      <DicionarioDeProfissoes />
    </EstruturaApp>
  );
}
