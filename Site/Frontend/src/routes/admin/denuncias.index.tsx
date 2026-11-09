import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { DenunciasTabela } from "@/components/admin/DenunciasTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/denuncias/")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.denunciasindex.denunciasAdministracaoAcesso") },
      { name: "description", content: textoDaPagina("admin.denunciasindex.filaDeDenunciasEnviadasPelos") },
    ],
  }),
  component: AdminDenuncias,
});

function AdminDenuncias() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("admin.denunciasindex.denuncias")}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <DenunciasTabela />
      </Card>
    </div>
  );
}
