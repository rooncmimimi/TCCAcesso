import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { VagasTabela } from "@/components/admin/VagasTabela";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/admin/vagas")({
  head: () => ({
    meta: [
      { title: "Vagas — Administração ACESSO" },
      { name: "description", content: "Modere e oculte vagas publicadas na plataforma ACESSO." },
      { property: "og:title", content: "Vagas — Administração ACESSO" },
      { property: "og:description", content: "Moderação de vagas publicadas." },
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
