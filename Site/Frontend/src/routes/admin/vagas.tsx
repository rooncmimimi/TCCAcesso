import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { VagasTabela } from "@/components/admin/VagasTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/vagas")({
  head: () => ({
    meta: [
      ...metaPagina(dic().admin.meta.vagas).meta,
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminVagas,
});

function AdminVagas() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.vagas}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <VagasTabela />
      </Card>
    </div>
  );
}
