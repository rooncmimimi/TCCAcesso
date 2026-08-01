import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — ACESSO" },
      { name: "description", content: "Acesse sua conta ACESSO e continue sua jornada profissional inclusiva." },
      { property: "og:title", content: "Entrar — ACESSO" },
      { property: "og:description", content: "Acesse sua conta na rede profissional acessível." },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  return (
    <div className="grid min-h-dvh place-items-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Voltar para a página inicial" className="mb-6 inline-flex">
          <Logo />
        </Link>
        <Card className="shadow-card">
          <CardContent className="p-6">
            <h1 className="text-2xl font-extrabold">Entrar no ACESSO</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suas preferências de acessibilidade acompanham sua conta.
            </p>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                signIn({
                  nome: email.split("@")[0] || "Pessoa Usuária",
                  email,
                  tipo: "candidato",
                  titulo: "Profissional em busca de oportunidades",
                  cidade: "São Paulo, SP",
                  onboarded: true,
                });
                navigate({ to: "/feed" });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="min-h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="min-h-12"
                />
              </div>
              <Button type="submit" className="min-h-12 w-full text-base">
                Entrar <ArrowRight aria-hidden="true" />
              </Button>
            </form>
            <p className="mt-6 text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="font-semibold text-primary underline">
                Criar conta gratuita
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
