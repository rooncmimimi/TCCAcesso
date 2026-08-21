import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { GuardaAcesso } from "@/components/GuardaAcesso";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditarPerfilDialog } from "@/components/perfil/EditarPerfilDialog";
import { EditarEmpresaDialog } from "@/components/perfil/EditarEmpresaDialog";
import { SecaoTrocarEmail } from "@/components/configuracoes/SecaoTrocarEmail";
import { SecaoContaPerigo } from "@/components/configuracoes/SecaoContaPerigo";
import { useSession } from "@/contexts/SessionContext";
import { perfilService } from "@/services/perfil.service";
import { empresasService } from "@/services/empresas.service";

export const Route = createFileRoute("/configuracoes/conta")({
  head: () => ({
    meta: [
      { title: "Conta — ACESSO" },
      { name: "description", content: "Gerencie os dados da sua conta ACESSO." },
    ],
  }),
  component: () => (
    <GuardaAcesso tipos={["candidato", "empresa", "administrador"]}>
      <Conta />
    </GuardaAcesso>
  ),
});

function formatarData(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

const RUBRICA_TIPO: Record<string, string> = {
  candidato: "Pessoa candidata",
  empresa: "Empresa",
  administrador: "Administrador",
};

function Conta() {
  const { user } = useSession();

  const { data: candidato } = useQuery({
    queryKey: ["meu-candidato"],
    queryFn: () => perfilService.meuCandidato(),
    enabled: user?.tipo === "candidato",
  });

  const { data: empresa } = useQuery({
    queryKey: ["minha-empresa"],
    queryFn: () => empresasService.minhaEmpresa(),
    enabled: user?.tipo === "empresa",
  });

  return (
    <AppShell>
      <Link
        to="/configuracoes"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para configurações
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Conta</h1>
      <p className="text-sm text-muted-foreground sm:text-base">Seus dados de acesso e informações da conta.</p>

      <div className="mt-6 space-y-4">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Informações da conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Nome</dt>
                <dd className="font-medium">{user?.nome}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Tipo de conta</dt>
                <dd className="font-medium">{user ? RUBRICA_TIPO[user.tipo] ?? user.tipo : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Conta criada em</dt>
                <dd className="font-medium">{formatarData(user?.criadoEm ?? user?.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-muted-foreground">Último acesso</dt>
                <dd className="font-medium">{formatarData(user?.ultimoLogin)}</dd>
              </div>
            </dl>

            {user?.tipo === "empresa" && empresa ? (
              <EditarEmpresaDialog empresa={empresa}>
                <Button variant="outline" className="min-h-11 gap-2">
                  <Pencil className="size-4" aria-hidden="true" /> Editar dados da empresa
                </Button>
              </EditarEmpresaDialog>
            ) : user?.tipo === "candidato" ? (
              <EditarPerfilDialog candidato={candidato}>
                <Button variant="outline" className="min-h-11 gap-2">
                  <Pencil className="size-4" aria-hidden="true" /> Editar nome, telefone e localidade
                </Button>
              </EditarPerfilDialog>
            ) : null}
          </CardContent>
        </Card>

        <SecaoTrocarEmail />

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">Senha</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/configuracoes/senha">Alterar senha</Link>
            </Button>
          </CardContent>
        </Card>

        <SecaoContaPerigo />
      </div>
    </AppShell>
  );
}
