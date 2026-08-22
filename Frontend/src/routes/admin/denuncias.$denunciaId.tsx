import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MessageSquareText } from "lucide-react";

import { AppShell } from "@/layouts/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extrairMensagemErro } from "@/services/api";
import denunciaService, {
  ACAO_POR_TIPO,
  MOTIVO_ROTULO,
  type MensagemContexto,
  type StatusDenuncia,
} from "@/services/denuncia.service";

export const Route = createFileRoute("/admin/denuncias/$denunciaId")({
  head: () => ({
    meta: [{ title: "Detalhe da denúncia — Administração ACESSO" }],
  }),
  component: AdminDenunciaDetalhe,
});

const STATUS_ROTULO: Record<StatusDenuncia, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  resolvida: "Resolvida",
  rejeitada: "Rejeitada",
  arquivada: "Arquivada",
};

const STATUS_TOM: Record<StatusDenuncia, "sucesso" | "atencao" | "perigo" | "neutro"> = {
  pendente: "atencao",
  em_analise: "atencao",
  resolvida: "sucesso",
  rejeitada: "perigo",
  arquivada: "neutro",
};

const ACAO_ROTULO: Record<string, string> = {
  bloquear: "bloquear este usuário",
  remover: "remover este conteúdo",
  ocultar: "ocultar esta vaga",
  suspender: "suspender esta empresa",
};

function AdminDenunciaDetalhe() {
  const { denunciaId } = Route.useParams();
  const queryClient = useQueryClient();
  const [dialogoTransicao, setDialogoTransicao] = useState<"resolver" | "rejeitar" | "arquivar" | null>(
    null,
  );
  const [observacao, setObservacao] = useState("");
  const [comAcao, setComAcao] = useState(true);
  const [contextoAberto, setContextoAberto] = useState(false);

  const { data: denuncia, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "denuncia", denunciaId],
    queryFn: () => denunciaService.obterDenuncia(denunciaId),
  });

  const contexto = useQuery({
    queryKey: ["admin", "denuncia", denunciaId, "contexto-mensagem"],
    queryFn: () => denunciaService.obterContextoMensagem(denunciaId),
    enabled: contextoAberto && denuncia?.entidadeTipo === "mensagem",
  });

  function invalidar() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "denuncia", denunciaId] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "denuncias"] });
  }

  const atribuir = useMutation({
    mutationFn: () => denunciaService.atribuirDenuncia(denunciaId),
    onSuccess: () => {
      toast.success("Denúncia atribuída a você.");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const acaoEsperada = denuncia ? ACAO_POR_TIPO[denuncia.entidadeTipo] : undefined;

  const transicao = useMutation({
    mutationFn: () => {
      if (dialogoTransicao === "resolver") {
        return denunciaService.resolverDenuncia(denunciaId, {
          observacao: observacao.trim() || undefined,
          acao: comAcao && acaoEsperada ? acaoEsperada : undefined,
        });
      }
      if (dialogoTransicao === "rejeitar") {
        return denunciaService.rejeitarDenuncia(denunciaId, observacao.trim() || undefined);
      }
      return denunciaService.arquivarDenuncia(denunciaId, observacao.trim() || undefined);
    },
    onSuccess: () => {
      toast.success("Denúncia atualizada.");
      setDialogoTransicao(null);
      setObservacao("");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível concluir a ação.")),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  if (isError || !denuncia) {
    return (
      <AppShell>
        <div role="alert" className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível carregar esta denúncia.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      </AppShell>
    );
  }

  const transitavel = denuncia.status === "pendente" || denuncia.status === "em_analise";

  return (
    <AppShell>
      <Link
        to="/admin/denuncias"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para denúncias
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Denúncia de {denuncia.entidadeTipo}</h1>
        <StatusBadge tom={STATUS_TOM[denuncia.status]}>{STATUS_ROTULO[denuncia.status]}</StatusBadge>
      </div>

      <Card className="mt-4 shadow-none">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Motivo</p>
              <p className="mt-1 text-sm">{MOTIVO_ROTULO[denuncia.motivo]}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Denunciante</p>
              <p className="mt-1 text-sm">
                {denuncia.denunciante?.nome} ({denuncia.denunciante?.email})
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Registrada em</p>
              <p className="mt-1 text-sm">{new Date(denuncia.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Responsável</p>
              <p className="mt-1 text-sm">{denuncia.adminResponsavel?.nome ?? "Ninguém atribuído"}</p>
            </div>
          </div>

          {denuncia.descricao && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Descrição do denunciante
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{denuncia.descricao}</p>
            </div>
          )}

          {denuncia.observacaoAdmin && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">Observação da moderação</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{denuncia.observacaoAdmin}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground">Conteúdo denunciado</p>
          {denuncia.entidadeTipo === "mensagem" ? (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                O conteúdo de mensagens só pode ser consultado através do contexto da conversa.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => setContextoAberto(true)}
              >
                <MessageSquareText className="size-4" aria-hidden="true" /> Ver contexto da mensagem
              </Button>
            </div>
          ) : denuncia.previaEntidade ? (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-secondary p-3 text-sm">
              {JSON.stringify(denuncia.previaEntidade, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Este conteúdo não existe mais ou já foi removido.
            </p>
          )}
        </CardContent>
      </Card>

      {transitavel && (
        <Card className="mt-4 shadow-none">
          <CardContent className="flex flex-wrap gap-2 p-5 sm:p-6">
            {denuncia.status === "pendente" && (
              <Button variant="outline" disabled={atribuir.isPending} onClick={() => atribuir.mutate()}>
                {atribuir.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Atribuir a mim
              </Button>
            )}
            <Button onClick={() => setDialogoTransicao("resolver")}>Resolver</Button>
            <Button variant="outline" onClick={() => setDialogoTransicao("rejeitar")}>
              Rejeitar
            </Button>
            <Button variant="outline" onClick={() => setDialogoTransicao("arquivar")}>
              Arquivar
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(dialogoTransicao)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setDialogoTransicao(null);
            setObservacao("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogoTransicao === "resolver"
                ? "Resolver denúncia"
                : dialogoTransicao === "rejeitar"
                  ? "Rejeitar denúncia"
                  : "Arquivar denúncia"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao-denuncia">Observação (opcional)</Label>
              <Textarea
                id="observacao-denuncia"
                value={observacao}
                onChange={(evento) => setObservacao(evento.target.value)}
                maxLength={1000}
                className="mt-1 min-h-24 resize-none"
              />
            </div>

            {dialogoTransicao === "resolver" && acaoEsperada && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="com-acao"
                  checked={comAcao}
                  onCheckedChange={(valor) => setComAcao(Boolean(valor))}
                />
                <Label htmlFor="com-acao" className="text-sm font-normal leading-snug">
                  Também {ACAO_ROTULO[acaoEsperada] ?? acaoEsperada} ao resolver
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={transicao.isPending}
              onClick={() => {
                setDialogoTransicao(null);
                setObservacao("");
              }}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={transicao.isPending} onClick={() => transicao.mutate()}>
              {transicao.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contextoAberto} onOpenChange={setContextoAberto}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contexto da mensagem denunciada</DialogTitle>
          </DialogHeader>

          {contexto.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : contexto.isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar o contexto.</p>
          ) : contexto.data ? (
            <ul className="space-y-2">
              {contexto.data.antes.map((m) => (
                <BolhaContexto key={m.id} mensagem={m} />
              ))}
              <BolhaContexto mensagem={contexto.data.mensagemDenunciada} denunciada />
              {contexto.data.depois.map((m) => (
                <BolhaContexto key={m.id} mensagem={m} />
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function BolhaContexto({ mensagem, denunciada = false }: { mensagem: MensagemContexto; denunciada?: boolean }) {
  return (
    <li
      className={`rounded-lg border p-3 text-sm ${denunciada ? "border-destructive bg-destructive/5" : "border-border"}`}
    >
      <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(mensagem.created_at).toLocaleString("pt-BR")}
        {denunciada ? " · mensagem denunciada" : ""}
      </p>
    </li>
  );
}
