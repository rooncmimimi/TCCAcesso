import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { DenunciasTabela } from "@/components/admin/DenunciasTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/denuncias/")({
  head: () => metaPagina(dic().admin.meta.denuncias),
  component: AdminDenuncias,
});

function AdminDenuncias() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.denuncias}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <DenunciasTabela />
      </Card>
    </div>
  );
}
