import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { LogsTabela } from "@/components/admin/LogsTabela";
import adminService from "@/services/admin.service";
import denunciaService, { MOTIVO_ROTULO } from "@/services/denuncia.service";

export const Route = createFileRoute("/admin/usuarios/$usuarioId")({
  head: () => ({
    meta: [{ title: "Detalhe do usuário — Administração ACESSO" }],
  }),
  component: AdminUsuarioDetalhe,
});

function AdminUsuarioDetalhe() {
  const { usuarioId } = Route.useParams();

  const { data: usuario, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "usuario", usuarioId],
    queryFn: () => adminService.obterUsuario(usuarioId),
  });

  const { data: denunciasRecebidas } = useQuery({
    queryKey: ["admin", "denuncias", "por-usuario", usuarioId],
    queryFn: () => denunciaService.listarDenuncias({ entidadeTipo: "usuario", entidadeId: usuarioId, limit: 5 }),
    enabled: Boolean(usuario),
  });

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-40 w-full" />
      </AppShell>
    );
  }

  if (isError || !usuario) {
    return (
      <AppShell>
        <div role="alert" className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar este usuário.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to="/admin/usuarios"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para usuários
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{usuario.nome}</h1>
        <StatusBadge tom={usuario.ativo ? "sucesso" : "perigo"}>
          {usuario.ativo ? "Ativo" : "Bloqueado"}
        </StatusBadge>
      </div>

      <Card className="mt-4 shadow-none">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">E-mail</p>
            <p className="mt-1 text-sm">{usuario.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Tipo</p>
            <p className="mt-1 text-sm capitalize">{usuario.tipoUsuario}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Cadastrado em</p>
            <p className="mt-1 text-sm">
              {usuario.created_at ? new Date(usuario.created_at).toLocaleDateString("pt-BR") : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">Denúncias recebidas</h2>
          {!denunciasRecebidas || denunciasRecebidas.denuncias.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma denúncia contra este usuário.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {denunciasRecebidas.denuncias.map((denuncia) => (
                <li key={denuncia.id} className="rounded-lg border p-3 text-sm">
                  <Link
                    to="/admin/denuncias/$denunciaId"
                    params={{ denunciaId: denuncia.id }}
                    className="font-semibold hover:underline"
                  >
                    {MOTIVO_ROTULO[denuncia.motivo]}
                  </Link>{" "}
                  <span className="text-muted-foreground">— {denuncia.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-0">
          <h2 className="p-5 pb-0 text-lg font-bold sm:px-6 sm:pt-6">Histórico administrativo</h2>
          <LogsTabela entidadeId={usuarioId} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
