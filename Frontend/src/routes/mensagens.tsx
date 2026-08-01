import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/layouts/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { conversas } from "@/lib/mock-data";
import { initials } from "@/contexts/SessionContext";

export const Route = createFileRoute("/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagens — ACESSO" },
      { name: "description", content: "Converse com empresas parceiras sobre vagas e processos seletivos." },
      { property: "og:title", content: "Mensagens — ACESSO" },
      { property: "og:description", content: "Suas conversas com empresas inclusivas." },
    ],
  }),
  component: Mensagens,
});

function Mensagens() {
  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Mensagens</h1>
      <p className="mt-2 text-muted-foreground">Conversas com empresas e recrutadores.</p>
      <ul className="mt-6 space-y-3">
        {conversas.map((c) => (
          <li key={c.id}>
            <Card className="shadow-none transition-shadow hover:shadow-card">
              <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                <Avatar className="size-11 shrink-0">
                  <AvatarFallback className="bg-primary-soft text-sm font-bold text-primary">
                    {initials(c.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.previa}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">{c.tempo}</p>
                  {c.naoLidas > 0 && (
                    <Badge className="mt-1">{c.naoLidas} não lidas</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
