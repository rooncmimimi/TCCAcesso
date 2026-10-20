import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { ComentariosTabela } from "@/components/admin/ComentariosTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/comentarios")({
  head: () => metaPagina(dic().admin.meta.comentarios),
  component: AdminComentarios,
});

function AdminComentarios() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.comentarios}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <ComentariosTabela />
      </Card>
    </div>
  );
}
