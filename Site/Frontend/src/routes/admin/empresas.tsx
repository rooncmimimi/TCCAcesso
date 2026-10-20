import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { EmpresasPendentesTabela } from "@/components/admin/EmpresasPendentesTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/empresas")({
  head: () => ({
    meta: [
      ...metaPagina(dic().admin.meta.empresas).meta,
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminEmpresas,
});

function AdminEmpresas() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.empresas}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <EmpresasPendentesTabela />
      </Card>
    </div>
  );
}
