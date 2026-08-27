import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/components/ui/card";
import { ComentariosTabela } from "@/components/admin/ComentariosTabela";

export const Route = createFileRoute("/admin/comentarios")({
  head: () => ({
    meta: [
      { title: "Comentários — Administração ACESSO" },
      { name: "description", content: "Modere comentários publicados na plataforma ACESSO." },
    ],
  }),
  component: AdminComentarios,
});

function AdminComentarios() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Comentários</h1>
      <Card className="overflow-hidden p-0 shadow-none">
        <ComentariosTabela />
      </Card>
    </div>
  );
}
