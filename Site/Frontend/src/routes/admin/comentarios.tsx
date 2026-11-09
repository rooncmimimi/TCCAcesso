import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { ComentariosTabela } from "@/components/admin/ComentariosTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/comentarios")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.comentarios.comentariosAdministracaoAcesso") },
      { name: "description", content: textoDaPagina("admin.comentarios.modereComentariosPublicadosNa") },
    ],
  }),
  component: AdminComentarios,
});

function AdminComentarios() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("admin.comentarios.comentarios")}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <ComentariosTabela />
      </Card>
    </div>
  );
}
