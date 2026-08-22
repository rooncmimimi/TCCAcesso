import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { DenunciasTabela } from "@/components/admin/DenunciasTabela";

export const Route = createFileRoute("/admin/denuncias/")({
  head: () => ({
    meta: [
      { title: "Denúncias — Administração ACESSO" },
      { name: "description", content: "Fila de denúncias enviadas pelos usuários da plataforma ACESSO." },
    ],
  }),
  component: AdminDenuncias,
});

function AdminDenuncias() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Denúncias</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <DenunciasTabela />
      </Card>
    </div>
  );
}
