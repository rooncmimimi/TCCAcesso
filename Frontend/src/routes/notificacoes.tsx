import { createFileRoute } from "@tanstack/react-router";
import { Bell, Briefcase, Users } from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { notificacoes } from "@/lib/mock-data";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — ACESSO" },
      { name: "description", content: "Acompanhe candidaturas, vagas compatíveis e novidades da sua rede." },
      { property: "og:title", content: "Notificações — ACESSO" },
      { property: "og:description", content: "Novidades sobre suas candidaturas e vagas." },
    ],
  }),
  component: Notificacoes,
});

const icones = { candidatura: Briefcase, vaga: Bell, rede: Users };

function Notificacoes() {
  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Notificações</h1>
      <ul className="mt-6 space-y-3">
        {notificacoes.map((n) => {
          const Icon = icones[n.tipo];
          return (
            <li key={n.id}>
              <Card className="shadow-none transition-shadow hover:shadow-card">
                <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-4">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold">{n.titulo}</p>
                    <p className="text-sm text-muted-foreground">{n.detalhe}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.tempo}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
