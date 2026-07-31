import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccessibilityPanel } from "@/components/accessibility/AccessibilityPanel";
import { useAccessibility } from "@/lib/accessibility";
import { useSpeech } from "@/lib/speech";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/configuracoes/acessibilidade")({
  head: () => ({
    meta: [
      { title: "Configurações de acessibilidade — ACESSO" },
      {
        name: "description",
        content:
          "Ajuste contraste, tipografia, espaçamentos, cursor, voz e VLibras com pré-visualização em tempo real.",
      },
      { property: "og:title", content: "Configurações de acessibilidade — ACESSO" },
      { property: "og:description", content: "Personalize a acessibilidade e veja as mudanças na hora." },
    ],
  }),
  component: ConfigAcessibilidade,
});

function ConfigAcessibilidade() {
  const { save, discard, reset, dirty } = useAccessibility();
  const { clearChoice } = useSpeech();
  const { user } = useSession();

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold">Configurações de acessibilidade</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Todas as mudanças aparecem imediatamente na tela. Teste à vontade e salve quando estiver do
        seu jeito.{" "}
        {user
          ? "Ao salvar, as preferências ficam vinculadas à sua conta."
          : "Sem login, as preferências ficam salvas neste dispositivo."}
      </p>

      <Card className="mt-6 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <AccessibilityPanel />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 border-t border-border bg-background py-4">
        <Button
          className="min-h-12 text-base"
          onClick={() => {
            save();
            toast.success("Preferências de acessibilidade salvas.");
          }}
        >
          <Save aria-hidden="true" /> Salvar preferências
        </Button>
        <Button
          variant="outline"
          className="min-h-12 text-base"
          disabled={!dirty}
          onClick={() => discard()}
        >
          <Undo2 aria-hidden="true" /> Descartar alterações
        </Button>
        <Button
          variant="ghost"
          className="min-h-12 text-base"
          onClick={() => {
            reset();
            clearChoice();
            toast.info("Preferências redefinidas. A pergunta sobre voz será feita novamente.");
          }}
        >
          <RotateCcw aria-hidden="true" /> Redefinir tudo
        </Button>
      </div>
    </AppShell>
  );
}
