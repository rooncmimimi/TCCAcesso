import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/layouts/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vagas } from "@/lib/mock-data";

export const Route = createFileRoute("/vagas")({
  head: () => ({
    meta: [
      { title: "Vagas inclusivas — ACESSO" },
      {
        name: "description",
        content: "Busque vagas com recursos de acessibilidade declarados por empresas verificadas.",
      },
      { property: "og:title", content: "Vagas inclusivas — ACESSO" },
      { property: "og:description", content: "Oportunidades para PCD e profissionais 50+." },
    ],
  }),
  component: Vagas,
});

function Vagas() {
  const [busca, setBusca] = useState("");
  const lista = vagas.filter((v) =>
    `${v.titulo} ${v.empresa} ${v.local}`.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Vagas inclusivas</h1>
      <p className="mt-2 text-muted-foreground">
        {lista.length} oportunidades com recursos de acessibilidade declarados.
      </p>

      <Card className="mt-6 shadow-none">
        <CardContent className="p-4">
          <Label htmlFor="busca-vagas" className="text-sm font-bold">
            Buscar vaga
          </Label>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              id="busca-vagas"
              className="min-h-12"
              placeholder="Cargo, empresa ou cidade"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Button className="min-h-12 shrink-0" aria-label="Buscar">
              <Search aria-hidden="true" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ul className="mt-6 space-y-4">
        {lista.map((v) => (
          <li key={v.id}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold">{v.titulo}</h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {v.empresa} · {v.contrato} · {v.salario}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" aria-hidden="true" /> {v.modalidade} ·{" "}
                      {v.local} · {v.publicada}
                    </p>
                    <p className="mt-3 text-sm">{v.descricao}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {v.recursos.map((r) => (
                        <li key={r}>
                          <Badge variant="secondary" className="gap-1 font-medium">
                            <CheckCircle2 className="size-3" aria-hidden="true" /> {r}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button className="min-h-12 shrink-0">Candidatar-se</Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
