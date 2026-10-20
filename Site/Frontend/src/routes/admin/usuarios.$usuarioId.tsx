import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ExcluirContaDialog } from "@/components/admin/ExcluirContaDialog";
import { LogsTabela } from "@/components/admin/LogsTabela";
import { rotuloOuValor } from "@/components/admin/rotulos";
import { useSessao } from "@/hooks/useSessao";
import { dic, metaPagina, useT } from "@/i18n";
import adminService from "@/services/admin.service";
import { extrairMensagemErro } from "@/services/api";
import denunciaService from "@/services/denuncia.service";
import { formatarDataHoraLocal, formatarDataLocal } from "@/utils/formatacao";

export const Route = createFileRoute("/admin/usuarios/$usuarioId")({
  head: () => metaPagina(dic().admin.meta.usuarioDetalhe),
  component: AdminUsuarioDetalhe,
});

function AdminUsuarioDetalhe() {
  const t = useT();
  const tu = t.admin.usuarios;
  const td = tu.detalhe;
  const { usuarioId } = Route.useParams();
  const { usuario: usuarioLogado } = useSessao();
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
      toast.success(dic().admin.usuarios.excluidoOk);
      queryClient.invalidateQueries({ queryKey: ["admin", "usuarios"] });
      void navigate({ to: "/admin/usuarios" });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.usuarios.erroExcluir)),
  });

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (isError || !usuario) {
    return (
      <div role="alert" className="space-y-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">{td.erroCarregar}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Link
        to="/admin/usuarios"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {td.voltar}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{usuario.nome}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tom={usuario.ativo ? "sucesso" : "perigo"}>
            {usuario.ativo ? t.admin.comum.ativo : t.admin.comum.bloqueado}
          </StatusBadge>
          <Link
            to="/perfil/$usuarioId"
            params={{ usuarioId }}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary"
          >
            <ExternalLink className="size-4" aria-hidden="true" /> {td.verPerfilPublico}
          </Link>
          {/* Mesma restrição do backend (garantirAlvoDeAcaoAdministrativa):
              nunca oferecida contra a própria conta nem outra conta admin. */}
          {usuario.tipoUsuario !== "administrador" && usuario.id !== usuarioLogado?.id && (
            <Button variant="destructive" className="min-h-11" onClick={() => setExcluindo(true)}>
              <Trash2 className="size-4" aria-hidden="true" /> {tu.excluirConta}
            </Button>
          )}
        </div>
      </div>

      <Card className="mt-4 shadow-none">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">{td.email}</p>
            <p className="mt-1 text-sm">{usuario.email}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">{td.tipo}</p>
            <p className="mt-1 text-sm">{rotuloOuValor(tu.tipos, usuario.tipoUsuario)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">{td.cadastradoEm}</p>
            <p className="mt-1 text-sm">
              {usuario.criadoEm ? formatarDataLocal(usuario.criadoEm) : t.comum.semValor}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">{td.ultimaAtividade}</p>
            <p className="mt-1 text-sm">
              {usuario.ultimoLogin ? formatarDataHoraLocal(usuario.ultimoLogin) : td.nuncaAcessou}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">{td.denunciasRecebidas}</h2>
          {!denunciasRecebidas || denunciasRecebidas.denuncias.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{td.semDenuncias}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {denunciasRecebidas.denuncias.map((denuncia) => (
                <li key={denuncia.id} className="rounded-lg border p-3 text-sm">
                  <Link
                    to="/admin/denuncias/$denunciaId"
                    params={{ denunciaId: denuncia.id }}
                    className="font-semibold hover:underline"
                  >
                    {rotuloOuValor(t.moderacao.motivos, denuncia.motivo)}
                  </Link>{" "}
                  <span className="text-muted-foreground">
                    — {rotuloOuValor(t.admin.denuncias.status, denuncia.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-0">
          <h2 className="p-5 pb-0 text-lg font-bold sm:px-6 sm:pt-6">{td.historico}</h2>
          <LogsTabela entidadeId={usuarioId} />
        </CardContent>
      </Card>

      <ExcluirContaDialog
        usuario={excluindo ? usuario : null}
        idMotivo="motivo-exclusao-detalhe"
        motivo={motivoExclusao}
        onMotivoChange={setMotivoExclusao}
        carregando={mutacaoExclusao.isPending}
        onFechar={() => {
          setExcluindo(false);
          setMotivoExclusao("");
        }}
        onConfirmar={() => mutacaoExclusao.mutate()}
      />
    </>
  );
}
