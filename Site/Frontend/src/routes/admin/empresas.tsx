import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { EmpresasPendentesTabela } from "@/components/admin/EmpresasPendentesTabela";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/admin/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas — Administração ACESSO" },
      { name: "description", content: "Aprove ou reprove cadastros de empresas na plataforma ACESSO." },
      { property: "og:title", content: "Empresas — Administração ACESSO" },
      { property: "og:description", content: "Moderação de cadastros de empresas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminEmpresas,
});

function AdminEmpresas() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("admin.empresas.empresas")}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <EmpresasPendentesTabela />
      </Card>
    </div>
  );
}
