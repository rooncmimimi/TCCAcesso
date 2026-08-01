import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Building2, User } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cadastro")({
  validateSearch: z.object({ perfil: z.enum(["candidato", "empresa"]).optional() }),
  head: () => ({
    meta: [
      { title: "Criar conta — ACESSO" },
      {
        name: "description",
        content: "Crie sua conta no ACESSO e configure a acessibilidade do jeito que funciona para você.",
      },
      { property: "og:title", content: "Criar conta — ACESSO" },
      { property: "og:description", content: "Cadastro gratuito na rede profissional inclusiva." },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const { perfil } = Route.useSearch();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<"candidato" | "empresa">(perfil ?? "candidato");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h1 className="text-2xl font-extrabold">Criar conta gratuita</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Em seguida você configura sua acessibilidade e já vê o resultado em tempo real.
            </p>

            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-bold">Eu sou</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { valor: "candidato", label: "Pessoa candidata", icon: User },
                    { valor: "empresa", label: "Empresa", icon: Building2 },
                  ] as const
                ).map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    aria-pressed={tipo === op.valor}
                    onClick={() => setTipo(op.valor)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 text-left text-sm font-semibold transition-colors",
                      tipo === op.valor
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border hover:bg-secondary",
                    )}
                  >
                    <op.icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">{op.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                signIn({
                  nome,
                  email,
                  tipo,
                  titulo:
                    tipo === "empresa" ? "Empresa parceira" : "Profissional em busca de oportunidades",
                  cidade: "São Paulo, SP",
                  onboarded: false,
                });
                navigate({ to: "/boas-vindas" });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="nome">{tipo === "empresa" ? "Razão social" : "Nome completo"}</Label>
                <Input
                  id="nome"
                  required
                  className="min-h-12"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-cadastro">E-mail</Label>
                <Input
                  id="email-cadastro"
                  type="email"
                  required
                  className="min-h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha-cadastro">Senha</Label>
                <Input
                  id="senha-cadastro"
                  type="password"
                  required
                  minLength={8}
                  className="min-h-12"
                  autoComplete="new-password"
                  aria-describedby="senha-dica"
                />
                <p id="senha-dica" className="text-sm text-muted-foreground">
                  Use ao menos 8 caracteres, com letras e números.
                </p>
              </div>
              <Button type="submit" className="min-h-12 w-full text-base">
                Continuar para acessibilidade <ArrowRight aria-hidden="true" />
              </Button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/entrar" className="font-semibold text-primary underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
