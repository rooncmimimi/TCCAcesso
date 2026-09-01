import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { useSession } from "@/lib/session";
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
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [excluindo, setExcluindo] = useState(false);
  const [motivoExclusao, setMotivoExclusao] = useState("");

  const { data: usuario, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "usuario", usuarioId],
    queryFn: () => adminService.obterUsuario(usuarioId),
  });

  const { data: denunciasRecebidas } = useQuery({
    queryKey: ["admin", "denuncias", "por-usuario", usuarioId],
    queryFn: () => denunciaService.listarDenuncias({ entidadeTipo: "usuario", entidadeId: usuarioId, limit: 5 }),
    enabled: Boolean(usuario),
  });

  const mutacaoExclusao = useMutation({
    mutationFn: () => adminService.removerUsuario(usuarioId, motivoExclusao.trim() || undefined),
    onSuccess: () => {
      toast.success("Usuário excluído definitivamente.");
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      void navigate({ to: "/admin/usuarios" });
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível excluir esta conta."),
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
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tom={usuario.ativo ? "sucesso" : "perigo"}>
            {usuario.ativo ? "Ativo" : "Bloqueado"}
          </StatusBadge>
          <Link
            to="/perfil/$usuarioId"
            params={{ usuarioId }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary"
          >
            <ExternalLink className="size-4" aria-hidden="true" /> Ver perfil público
          </Link>
          {/* Mesma restrição do backend (garantirAlvoDeAcaoAdministrativa):
              nunca oferecida contra a própria conta nem outra conta admin. */}
          {usuario.tipoUsuario !== "administrador" && usuario.id !== user?.id && (
            <Button variant="destructive" className="min-h-11" onClick={() => setExcluindo(true)}>
              <Trash2 className="size-4" aria-hidden="true" /> Excluir conta
            </Button>
          )}
        </div>
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
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Última atividade</p>
            <p className="mt-1 text-sm">
              {usuario.ultimoLogin ? new Date(usuario.ultimoLogin).toLocaleString("pt-BR") : "Nunca acessou"}
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

      <ConfirmarAcaoDialog
        open={excluindo}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setExcluindo(false);
            setMotivoExclusao("");
          }
        }}
        titulo="Excluir conta definitivamente"
        descricao={
          <div className="space-y-3">
            <p>
              Tem certeza que deseja excluir permanentemente a conta de{" "}
              <strong>&quot;{usuario.nome}&quot;</strong> ({usuario.email})?
            </p>
            <p className="font-semibold text-destructive">
              Esta ação é irreversível. Todos os dados da conta — perfil, publicações,
              candidaturas, mensagens e arquivos enviados — serão apagados
              definitivamente do banco de dados e não poderão ser recuperados.
            </p>
            <div>
              <Label htmlFor="motivo-exclusao-detalhe">Motivo (opcional)</Label>
              <Textarea
                id="motivo-exclusao-detalhe"
                value={motivoExclusao}
                onChange={(evento) => setMotivoExclusao(evento.target.value)}
                className="mt-1 min-h-20 resize-none"
                placeholder="Registrado no log de auditoria administrativa"
              />
            </div>
          </div>
        }
        textoConfirmar="Excluir definitivamente"
        destrutivo
        carregando={mutacaoExclusao.isPending}
        onConfirmar={() => mutacaoExclusao.mutate()}
      />
    </AppShell>
  );
}
