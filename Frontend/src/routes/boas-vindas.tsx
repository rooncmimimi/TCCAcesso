import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSession } from "@/contexts/SessionContext";

export const Route = createFileRoute("/boas-vindas")({
  head: () => ({
    meta: [
      { title: "Configure sua acessibilidade — ACESSO" },
      {
        name: "description",
        content:
          "Primeiro acesso: ajuste contraste, fonte, voz e Libras e veja cada mudança em tempo real antes de salvar.",
      },
      { property: "og:title", content: "Configure sua acessibilidade — ACESSO" },
      { property: "og:description", content: "Personalize a plataforma antes de começar a usar." },
    ],
  }),
  component: BoasVindas,
});

function BoasVindas() {
  const { save } = useAccessibility();
  const { user, update } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-secondary">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Logo />
        </div>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">Passo 1 de 1</p>
        <h1 className="mt-2 text-3xl font-extrabold">
          {user?.nome ? `Bem-vindo(a), ${user.nome.split(" ")[0]}!` : "Bem-vindo(a) ao ACESSO!"}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Ajuste como você quer ver, ouvir e navegar. Tudo muda na hora — teste à vontade e salve
          somente quando estiver do seu jeito. Você pode alterar depois no menu do seu perfil.
        </p>

        <Card className="mt-8 shadow-card">
          <CardContent className="p-5 sm:p-6">
            <AccessibilityPanel />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 mt-8 flex flex-wrap gap-3 border-t border-border bg-secondary py-4">
          <Button
            className="min-h-12 text-base"
            onClick={() => {
              save();
              update({ onboarded: true });
              toast.success("Preferências salvas na sua conta.");
              navigate({ to: "/feed" });
            }}
          >
            <Check aria-hidden="true" /> Salvar e ir para o feed
          </Button>
          <Button
            variant="ghost"
            className="min-h-12 text-base"
            onClick={() => navigate({ to: "/feed" })}
          >
            Pular por agora <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </main>
    </div>
  );
}
