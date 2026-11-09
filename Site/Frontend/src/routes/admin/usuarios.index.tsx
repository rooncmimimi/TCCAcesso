import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { UsuariosTabela } from "@/components/admin/UsuariosTabela";
import { useIdioma } from "@/hooks/useIdioma";

export const Route = createFileRoute("/admin/usuarios/")({
  head: () => ({
    meta: [
      { title: "Usuários — Administração ACESSO" },
      { name: "description", content: "Bloqueie ou remova contas de usuários da plataforma ACESSO." },
      { property: "og:title", content: "Usuários — Administração ACESSO" },
      { property: "og:description", content: "Moderação de contas de usuários." },
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
