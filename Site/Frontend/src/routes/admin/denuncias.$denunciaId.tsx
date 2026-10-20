import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MessageSquareText } from "lucide-react";

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
import { rotuloOuValor } from "@/components/admin/rotulos";
import { dic, metaPagina, useT } from "@/i18n";
import { extrairMensagemErro } from "@/services/api";
import denunciaService, {
  ACAO_POR_TIPO,
  type MensagemContexto,
  type StatusDenuncia,
} from "@/services/denuncia.service";
import { formatarDataHoraLocal } from "@/utils/formatacao";

export const Route = createFileRoute("/admin/denuncias/$denunciaId")({
  head: () => metaPagina(dic().admin.meta.denunciaDetalhe),
  component: AdminDenunciaDetalhe,
});

const STATUS_TOM: Record<StatusDenuncia, "sucesso" | "atencao" | "perigo" | "neutro"> = {
  pendente: "atencao",
  em_analise: "atencao",
  resolvida: "sucesso",
  rejeitada: "perigo",
  arquivada: "neutro",
};

function AdminDenunciaDetalhe() {
  const t = useT();
  const td = t.admin.denuncias;
  const tdd = td.detalhe;
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
      toast.success(dic().admin.denuncias.detalhe.atribuida);
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.comum.erroAcao)),
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
      toast.success(dic().admin.denuncias.detalhe.atualizada);
      setDialogoTransicao(null);
      setObservacao("");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.comum.erroAcao)),
  });

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !denuncia) {
    return (
      <div role="alert" className="space-y-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">{tdd.erroCarregar}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  const transitavel = denuncia.status === "pendente" || denuncia.status === "em_analise";

  return (
    <>
      <Link
        to="/admin/denuncias"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {tdd.voltar}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {tdd.titulo(rotuloOuValor(td.tipos, denuncia.entidadeTipo))}
        </h1>
        <StatusBadge tom={STATUS_TOM[denuncia.status]}>{rotuloOuValor(td.status, denuncia.status)}</StatusBadge>
      </div>

      <Card className="mt-4 shadow-none">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.motivo}</p>
              <p className="mt-1 text-sm">{rotuloOuValor(t.moderacao.motivos, denuncia.motivo)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.denunciante}</p>
              <p className="mt-1 text-sm">
                {denuncia.denunciante
                  ? `${denuncia.denunciante.nome} (${denuncia.denunciante.email})`
                  : t.admin.comum.usuarioRemovido}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.registradaEm}</p>
              <p className="mt-1 text-sm">{formatarDataHoraLocal(denuncia.criadoEm)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.responsavel}</p>
              <p className="mt-1 text-sm">{denuncia.administradorResponsavel?.nome ?? tdd.ninguemAtribuido}</p>
            </div>
          </div>

          {denuncia.descricao && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.descricaoDenunciante}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{denuncia.descricao}</p>
            </div>
          )}

          {denuncia.observacaoAdministrador && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.observacaoModeracao}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{denuncia.observacaoAdministrador}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground">{tdd.conteudoDenunciado}</p>
          {denuncia.entidadeTipo === "mensagem" ? (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">{tdd.mensagemAviso}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => setContextoAberto(true)}
              >
                <MessageSquareText className="size-4" aria-hidden="true" /> {tdd.verContextoMensagem}
              </Button>
            </div>
          ) : denuncia.previaEntidade ? (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-secondary p-3 text-sm">
              {JSON.stringify(denuncia.previaEntidade, null, 2)}
            </pre>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{tdd.conteudoInexistente}</p>
          )}
        </CardContent>
      </Card>

      {transitavel && (
        <Card className="mt-4 shadow-none">
          <CardContent className="flex flex-wrap gap-2 p-5 sm:p-6">
            {denuncia.status === "pendente" && (
              <Button variant="outline" disabled={atribuir.isPending} onClick={() => atribuir.mutate()}>
                {atribuir.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {tdd.atribuirMim}
              </Button>
            )}
            <Button onClick={() => setDialogoTransicao("resolver")}>{tdd.resolver}</Button>
            <Button variant="outline" onClick={() => setDialogoTransicao("rejeitar")}>
              {tdd.rejeitar}
            </Button>
            <Button variant="outline" onClick={() => setDialogoTransicao("arquivar")}>
              {tdd.arquivar}
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
                ? tdd.tituloResolver
                : dialogoTransicao === "rejeitar"
                  ? tdd.tituloRejeitar
                  : tdd.tituloArquivar}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao-denuncia">{tdd.observacao}</Label>
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
                  {tdd.tambemAcao(rotuloOuValor(tdd.acoes, acaoEsperada))}
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
              {t.comum.cancelar}
            </Button>
            <Button type="button" disabled={transicao.isPending} onClick={() => transicao.mutate()}>
              {transicao.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.comum.confirmar}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contextoAberto} onOpenChange={setContextoAberto}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tdd.contextoTitulo}</DialogTitle>
          </DialogHeader>

          {contexto.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : contexto.isError ? (
            <p className="text-sm text-destructive">{tdd.contextoErro}</p>
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
    </>
  );
}

function BolhaContexto({ mensagem, denunciada = false }: { mensagem: MensagemContexto; denunciada?: boolean }) {
  const t = useT();

  return (
    <li
      className={`rounded-lg border p-3 text-sm ${denunciada ? "border-destructive bg-destructive/5" : "border-border"}`}
    >
      <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatarDataHoraLocal(mensagem.criadoEm)}
        {denunciada ? ` · ${t.admin.denuncias.detalhe.mensagemDenunciada}` : ""}
      </p>
    </li>
  );
}
