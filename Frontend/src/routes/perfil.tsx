import { createFileRoute, Link } from "@tanstack/react-router";
import { Accessibility, Ear, Eye, PersonStanding, Pencil } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initials, useSession } from "@/lib/session";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — ACESSO" },
      { name: "description", content: "Seu perfil profissional acessível no ACESSO." },
      { property: "og:title", content: "Meu perfil — ACESSO" },
      { property: "og:description", content: "Perfil profissional com informações de acessibilidade." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user } = useSession();
  const nome = user?.nome ?? "Visitante";

  return (
    <AppShell>
      <Card className="overflow-hidden shadow-card">
        <div aria-hidden="true" className="h-32 bg-primary sm:h-40" />
        <CardContent className="p-5 sm:p-6">
          <div className="-mt-16 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <Avatar className="size-24 border-4 border-card">
              <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">
                {initials(nome)}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" className="min-h-11 shrink-0">
              <Pencil aria-hidden="true" /> Editar perfil
            </Button>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold">{nome}</h1>
          <p className="text-muted-foreground">{user?.titulo ?? "Membro do ACESSO"}</p>
          <p className="text-sm text-muted-foreground">{user?.cidade ?? "Brasil"}</p>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">Sobre mim</h2>
          <p className="mt-2 text-muted-foreground">
            Escreva um pouco sobre você, suas experiências e habilidades.
          </p>

          <h2 className="mt-6 text-lg font-bold">Informações de acessibilidade</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[
              { icon: Eye, label: "Leitor de tela" },
              { icon: Ear, label: "Libras" },
              { icon: PersonStanding, label: "Mobilidade reduzida" },
            ].map((i) => (
              <li key={i.label}>
                <Badge variant="secondary" className="min-h-9 gap-2 px-3 text-sm font-semibold">
                  <i.icon className="size-4" aria-hidden="true" /> {i.label}
                </Badge>
              </li>
            ))}
          </ul>
          <Button asChild variant="link" className="mt-4 h-11 px-0 font-semibold">
            <Link to="/configuracoes/acessibilidade">
              <Accessibility aria-hidden="true" /> Ajustar preferências de acessibilidade
            </Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
