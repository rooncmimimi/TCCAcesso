import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { VagasTabela } from "@/components/admin/VagasTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/vagas")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.vagas.vagasAdministracaoAcesso") },
      { name: "description", content: textoDaPagina("admin.vagas.modereEOculteVagasPublicadasNa") },
      { property: "og:title", content: textoDaPagina("admin.vagas.vagasAdministracaoAcesso") },
      { property: "og:description", content: textoDaPagina("admin.vagas.moderacaoDeVagasPublicadas") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminVagas,
});

function AdminVagas() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("cabecalho.vagas")}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <VagasTabela />
      </Card>
    </div>
  );
}
