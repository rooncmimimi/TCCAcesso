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
import type { ChaveBase } from "@/i18n/dicionarios";
import { textoDaPagina } from "@/i18n/textoDaPagina";
import { useIdioma } from "@/hooks/useIdioma";
import { extrairMensagemErro } from "@/services/api";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { ConteudoDenunciado } from "@/components/admin/ConteudoDenunciado";
import { HistoricoDaDenuncia } from "@/components/admin/HistoricoDaDenuncia";
import { useSessao } from "@/hooks/useSessao";
import denunciaService, {
  ACAO_POR_TIPO,
  MOTIVO_ROTULO,
  type Denuncia,
  type MensagemContexto,
  type StatusDenuncia,
} from "@/services/denuncia.service";

export const Route = createFileRoute("/admin/denuncias/$denunciaId")({
  head: () => ({
    meta: [{ title: textoDaPagina("admin.denunciasdenunciaId.detalheDaDenunciaAdministracao") }],
  }),
  component: AdminDenunciaDetalhe,
});

const STATUS_ROTULO: Record<StatusDenuncia, ChaveBase> = {
  pendente: "status.pendente",
  em_analise: "status.emAnalise",
  resolvida: "status.resolvida",
  rejeitada: "status.rejeitada",
  arquivada: "status.arquivada",
};

const STATUS_TOM: Record<StatusDenuncia, "sucesso" | "atencao" | "perigo" | "neutro"> = {
  pendente: "atencao",
  em_analise: "atencao",
  resolvida: "sucesso",
  rejeitada: "perigo",
  arquivada: "neutro",
};

const ACAO_ROTULO: Record<string, ChaveBase> = {
  bloquear: "admin.denunciasdenunciaId.bloquearEsteUsuario",
  remover: "admin.denunciasdenunciaId.removerEsteConteudo",
  ocultar: "admin.denunciasdenunciaId.ocultarEstaVaga",
  suspender: "admin.denunciasdenunciaId.suspenderEstaEmpresa",
};

function AdminDenunciaDetalhe() {
  const { t } = useIdioma();
  const { denunciaId } = Route.useParams();
  const queryClient = useQueryClient();
  const [dialogoTransicao, setDialogoTransicao] = useState<"resolver" | "rejeitar" | "arquivar" | null>(
    null,
  );
  const [observacao, setObservacao] = useState("");
  const [comAcao, setComAcao] = useState(true);
  const [contextoAberto, setContextoAberto] = useState(false);
  const { usuario: eu } = useSessao();
  const [confirmarAssumir, setConfirmarAssumir] = useState(false);

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
    mutationFn: (forcar: boolean) => denunciaService.atribuirDenuncia(denunciaId, { forcar }),
    onSuccess: (atualizada) => {
      // Mostra já o que a API confirmou (responsável e status), sem esperar a nova busca.
      queryClient.setQueryData<Denuncia>(["admin", "denuncia", denunciaId], (atual) =>
        atual
          ? {
              ...atual,
              status: atualizada.status,
              administradorResponsavelId: atualizada.administradorResponsavelId,
              administradorResponsavel: atualizada.administradorResponsavel ?? null,
            }
          : atual,
      );
      toast.success(t("admin.denunciasdenunciaId.denunciaAtribuidaAVoce"));
      setConfirmarAssumir(false);
      invalidar();
    },
    onError: (erro) => {
      setConfirmarAssumir(false);
      toast.error(extrairMensagemErro(erro));
    },
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
      toast.success(t("admin.denunciasdenunciaId.denunciaAtualizada"));
      setDialogoTransicao(null);
      setObservacao("");
      invalidar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("admin.denunciasdenunciaId.naoFoiPossivelConcluirAAcao"))),
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
        <p className="text-sm text-muted-foreground">{t("admin.denunciasdenunciaId.naoFoiPossivelCarregarEsta")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("raiz.tentarNovamente")}
        </Button>
      </div>
    );
  }

  const transitavel = denuncia.status === "pendente" || denuncia.status === "em_analise";
  const souResponsavel = Boolean(eu?.id) && denuncia.administradorResponsavelId === eu?.id;
  const comOutroAdministrador = Boolean(denuncia.administradorResponsavelId) && !souResponsavel;

  return (
    <>
      <Link
        to="/admin/denuncias"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> {t("admin.denunciasdenunciaId.voltarParaDenuncias")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Denúncia de {denuncia.entidadeTipo}</h1>
        <StatusBadge tom={STATUS_TOM[denuncia.status]}>{t(STATUS_ROTULO[denuncia.status])}</StatusBadge>
      </div>

      <Card className="mt-4 shadow-none">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.motivo")}</p>
              <p className="mt-1 text-sm">{MOTIVO_ROTULO[denuncia.motivo]}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.denunciante")}</p>
              <p className="mt-1 text-sm">
                {denuncia.denunciante
                  ? `${denuncia.denunciante.nome} (${denuncia.denunciante.email})`
                  : t("admin.denunciasdenunciaId.usuarioRemovido")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.registradaEm")}</p>
              <p className="mt-1 text-sm">{new Date(denuncia.criadoEm).toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.responsavel")}</p>
              <p className="mt-1 text-sm">{denuncia.administradorResponsavel
                  ? `${denuncia.administradorResponsavel.nome}${souResponsavel ? " (você)" : ""}`
                  : t("admin.denunciasdenunciaId.ninguemAtribuido")}</p>
            </div>
          </div>

          {denuncia.descricao && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">
                {t("admin.denunciasdenunciaId.descricaoDoDenunciante")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{denuncia.descricao}</p>
            </div>
          )}

          {denuncia.observacaoAdministrador && (
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.observacaoDaModeracao")}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{denuncia.observacaoAdministrador}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.conteudoDenunciado")}</p>
          {denuncia.entidadeTipo === "mensagem" ? (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                {t("admin.denunciasdenunciaId.oConteudoDeMensagensSoPodeSer")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => setContextoAberto(true)}
              >
                <MessageSquareText className="size-4" aria-hidden="true" /> {t("admin.denunciasdenunciaId.verContextoDaMensagem")}
              </Button>
            </div>
          ) : (
            <ConteudoDenunciado tipo={denuncia.entidadeTipo} previa={denuncia.previaEntidade} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground">{t("admin.denunciasdenunciaId.historicoDeTratamento")}</p>
          <HistoricoDaDenuncia
            registradaEm={denuncia.criadoEm}
            denunciante={denuncia.denunciante?.nome ?? null}
            eventos={denuncia.historico ?? []}
          />
        </CardContent>
      </Card>

      {transitavel && (
        <Card className="mt-4 shadow-none">
          <CardContent className="flex flex-wrap gap-2 p-5 sm:p-6">
            {souResponsavel ? (
              <p className="self-center text-sm text-muted-foreground">{t("admin.denunciasdenunciaId.voceEOResponsavelPorEsta")}</p>
            ) : (
              <Button
                variant="outline"
                disabled={atribuir.isPending}
                onClick={() => (comOutroAdministrador ? setConfirmarAssumir(true) : atribuir.mutate(false))}
              >
                {atribuir.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {comOutroAdministrador ? "Assumir denúncia" : t("admin.denunciasdenunciaId.atribuirAMim")}
              </Button>
            )}
            <Button onClick={() => setDialogoTransicao("resolver")}>{t("admin.denunciasdenunciaId.resolver")}</Button>
            <Button variant="outline" onClick={() => setDialogoTransicao("rejeitar")}>
              {t("admin.denunciasdenunciaId.rejeitar")}
            </Button>
            <Button variant="outline" onClick={() => setDialogoTransicao("arquivar")}>
              {t("dashboard.vagaEmpresaCard.arquivar")}
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmarAcaoDialog
        open={confirmarAssumir}
        onOpenChange={setConfirmarAssumir}
        titulo={t("admin.denunciasdenunciaId.assumirEstaDenuncia")}
        descricao={t("admin.denunciasdenunciaId.estaDenunciaEstaComDeseja", { var1: denuncia.administradorResponsavel?.nome ?? "outro administrador" })}
        textoConfirmar={t("admin.denunciasdenunciaId.assumir")}
        carregando={atribuir.isPending}
        onConfirmar={() => atribuir.mutate(true)}
      />

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
                ? t("admin.denunciasdenunciaId.resolverDenuncia")
                : dialogoTransicao === "rejeitar"
                  ? t("admin.denunciasdenunciaId.rejeitarDenuncia")
                  : t("admin.denunciasdenunciaId.arquivarDenuncia")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao-denuncia">{t("admin.denunciasdenunciaId.observacaoOpcional")}</Label>
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
                  {t("admin.denunciasdenunciaId.tambemAoResolver", { acao: ACAO_ROTULO[acaoEsperada] ? t(ACAO_ROTULO[acaoEsperada]) : acaoEsperada })}
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
              {t("post.cancelar")}
            </Button>
            <Button type="button" disabled={transicao.isPending} onClick={() => transicao.mutate()}>
              {transicao.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t("admin.denunciasdenunciaId.confirmar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contextoAberto} onOpenChange={setContextoAberto}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.denunciasdenunciaId.contextoDaMensagemDenunciada")}</DialogTitle>
          </DialogHeader>

          {contexto.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : contexto.isError ? (
            <p className="text-sm text-destructive">{t("admin.denunciasdenunciaId.naoFoiPossivelCarregarO")}</p>
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
  return (
    <li
      className={`rounded-lg border p-3 text-sm ${denunciada ? "border-destructive bg-destructive/5" : "border-border"}`}
    >
      <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(mensagem.criadoEm).toLocaleString("pt-BR")}
        {denunciada ? " · mensagem denunciada" : ""}
      </p>
    </li>
  );
}
