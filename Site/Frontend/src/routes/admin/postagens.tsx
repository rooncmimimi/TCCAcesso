import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { PostagensTabela } from "@/components/admin/PostagensTabela";
import { dic, metaPagina, useT } from "@/i18n";

export const Route = createFileRoute("/admin/postagens")({
  head: () => ({
    meta: [
      ...metaPagina(dic().admin.meta.postagens).meta,
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPostagens,
});

function AdminPostagens() {
  const t = useT();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t.admin.paginas.postagens}</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <PostagensTabela />
      </Card>
    </div>
  );
}
