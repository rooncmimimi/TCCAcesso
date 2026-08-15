import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { PostagensTabela } from "@/components/admin/PostagensTabela";

export const Route = createFileRoute("/admin/postagens")({
  head: () => ({
    meta: [
      { title: "Publicações — Administração ACESSO" },
      { name: "description", content: "Modere publicações e comentários da comunidade ACESSO." },
      { property: "og:title", content: "Publicações — Administração ACESSO" },
      { property: "og:description", content: "Moderação de publicações e comentários." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPostagens,
});

function AdminPostagens() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Publicações</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <PostagensTabela />
      </Card>
    </div>
  );
}
