import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { useSessao } from "@/hooks/useSessao";

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
  const { usuario, inicializado, autenticado } = useSessao();

  if (!inicializado) {
    return (
      <EstruturaApp>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
          <p>Carregando sua sessão…</p>
        </div>
      </EstruturaApp>
    );
  }

  if (!autenticado || !usuario) {
    return <Navigate to="/entrar" />;
  }

  if (usuario.tipo === "candidato") {
    return <Navigate to="/dashboard/candidato" />;
  }

  if (usuario.tipo === "empresa") {
    return <Navigate to="/dashboard/empresa" />;
  }

  if (usuario.tipo === "administrador") {
    return <Navigate to="/admin" />;
  }

  return <Navigate to="/feed" />;
}
