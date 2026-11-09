import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { EmpresasPendentesTabela } from "@/components/admin/EmpresasPendentesTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/empresas")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.empresas.empresasAdministracaoAcesso") },
      { name: "description", content: textoDaPagina("admin.empresas.aproveOuReproveCadastrosDe") },
      { property: "og:title", content: textoDaPagina("admin.empresas.empresasAdministracaoAcesso") },
      { property: "og:description", content: textoDaPagina("admin.empresas.moderacaoDeCadastrosDeEmpresas") },
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
