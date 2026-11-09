import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { UsuariosTabela } from "@/components/admin/UsuariosTabela";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/admin/usuarios/")({
  head: () => ({
    meta: [
      { title: textoDaPagina("admin.usuariosindex.usuariosAdministracaoAcesso") },
      { name: "description", content: textoDaPagina("admin.usuariosindex.bloqueieOuRemovaContasDe") },
      { property: "og:title", content: textoDaPagina("admin.usuariosindex.usuariosAdministracaoAcesso") },
      { property: "og:description", content: textoDaPagina("admin.usuariosindex.moderacaoDeContasDeUsuarios") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsuarios,
});

function AdminUsuarios() {
  const { t } = useIdioma();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("admin.usuariosindex.usuarios")}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <UsuariosTabela />
      </Card>
    </div>
  );
}
