import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { SecaoDoisFatores } from "@/components/configuracoes/SecaoDoisFatores";
import { SecaoSessoes } from "@/components/configuracoes/SecaoSessoes";

export const Route = createFileRoute("/configuracoes/seguranca")({
  head: () => ({
    meta: [
      { title: "Segurança — ACESSO" },
      { name: "description", content: "Gerencie a autenticação de dois fatores e a segurança da sua conta ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Seguranca />
    </GuardaAcesso>
  ),
});

function Seguranca() {
  return (
    <AppShell>
      <Link
        to="/configuracoes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para configurações
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Lock className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Segurança</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Proteja o acesso à sua conta ACESSO.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <SecaoDoisFatores />
        <SecaoSessoes />
      </div>
    </AppShell>
  );
}
