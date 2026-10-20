import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { UsuariosTabela } from "@/components/admin/UsuariosTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/usuarios/")({
  head: () => ({
    meta: [
      ...metaPagina(dic().admin.meta.usuarios).meta,
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsuarios,
});

function AdminUsuarios() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.usuarios}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <UsuariosTabela />
      </Card>
    </div>
  );
}
