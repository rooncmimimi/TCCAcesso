import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/layouts/AppShell";
import { useSession } from "@/contexts/SessionContext";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Painel — ACESSO" },
      { name: "description", content: "Acesse seu painel de métricas na plataforma ACESSO." },
    ],
  }),
  component: RedirecionarDashboard,
});

/** Encaminha o usuário autenticado ao painel correspondente ao seu tipo de conta. */
function RedirecionarDashboard() {
  const { user, hydrated, autenticado } = useSession();

  if (!hydrated) {
    return (
      <AppShell>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          <p>Carregando sua sessão…</p>
        </div>
      </AppShell>
    );
  }

  if (!autenticado || !user) {
    return <Navigate to="/entrar" />;
  }

  if (user.tipo === "candidato") {
    return <Navigate to="/dashboard/candidato" />;
  }

  if (user.tipo === "empresa") {
    return <Navigate to="/dashboard/empresa" />;
  }

  if (user.tipo === "administrador") {
    return <Navigate to="/admin" />;
  }

  return <Navigate to="/feed" />;
}
