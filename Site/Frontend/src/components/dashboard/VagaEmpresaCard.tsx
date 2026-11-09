import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  Calendar,
  Eye,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import type { ChaveBase } from "@/i18n/dicionarios";
import { useIdioma } from "@/hooks/useIdioma";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { extrairMensagemErro } from "@/services/api";
import vagasService from "@/services/vagas.service";
import { formatarData, formatarSalario } from "@/utils/formatacao";
import { ROTULO_CONTRATO } from "./constantesVaga";
import { EditarVagaDialog } from "./EditarVagaDialog";
import type { ContratoVaga, StatusVaga, Vaga } from "@/types";

const MENSAGEM_STATUS: Record<StatusVaga, ChaveBase> = {
  aberta: "dashboard.vagaEmpresaCard.vagaReaberta",
  pausada: "dashboard.vagaEmpresaCard.vagaArquivada",
  encerrada: "dashboard.vagaEmpresaCard.vagaEncerrada",
};

/** Card de gestão de uma vaga: dados principais + ações (editar, arquivar, reabrir, encerrar, excluir). */
export function VagaEmpresaCard({
  vaga,
  selecionada,
  onVerCandidaturas,
}: {
  vaga: Vaga;
  selecionada: boolean;
  onVerCandidaturas: (vaga: Vaga) => void;
}) {
  const { t } = useIdioma();
  const queryClient = useQueryClient();

  const invalidarListas = () => {
    void queryClient.invalidateQueries({ queryKey: ["minhas-vagas"] });
    void queryClient.invalidateQueries({ queryKey: ["metricas-empresa"] });
    void queryClient.invalidateQueries({ queryKey: ["vaga", vaga.id] });
  };

  // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a
  // leitura.
  const alterarStatus = useMutation({
    mutationFn: (status: StatusVaga) => vagasService.alterarStatus(vaga.id, status),
    onSuccess: (_dados, status) => {
      toast.success(t(MENSAGEM_STATUS[status]));
      invalidarListas();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("dashboard.vagaEmpresaCard.naoFoiPossivelAlterarOStatusDa"))),
  });

  const remover = useMutation({
    mutationFn: () => vagasService.remover(vaga.id),
    onSuccess: () => {
      toast.success(t("dashboard.vagaEmpresaCard.vagaExcluida"));
      invalidarListas();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("dashboard.vagaEmpresaCard.naoFoiPossivelExcluirAVaga"))),
  });

  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const publicadaEm = vaga.criadoEm;

  return (
    <Card className={selecionada ? "shadow-card ring-2 ring-primary" : "shadow-card"}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{vaga.titulo}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {local ? (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" /> {local}
                </span>
              ) : null}
              <span>{vaga.modalidade}</span>
              {vaga.contrato ? <span>{ROTULO_CONTRATO[vaga.contrato as ContratoVaga]}</span> : null}
              <span>{formatarSalario(typeof vaga.salario === "string" ? Number(vaga.salario) : vaga.salario)}</span>
            </p>
            {publicadaEm ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" aria-hidden="true" /> Publicada em {formatarData(publicadaEm)}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={vaga.status} />
            <Badge variant="outline" className="gap-1 font-medium">
              <Users className="size-3.5" aria-hidden="true" /> {vaga.totalCandidaturas ?? 0}{" "}
              {vaga.totalCandidaturas === 1 ? "candidatura" : "candidaturas"}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selecionada ? "default" : "outline"}
            className="min-h-9 gap-1"
            onClick={() => onVerCandidaturas(vaga)}
          >
            <Users className="size-4" aria-hidden="true" /> {t("admin.graficosRelatorios.candidaturas")}
          </Button>

          <Button asChild size="sm" variant="outline" className="min-h-9 gap-1">
            <Link to="/vaga/$vagaId" params={{ vagaId: vaga.id }}>
              <Eye className="size-4" aria-hidden="true" /> {t("dashboard.vagaEmpresaCard.verDetalhes")}
            </Link>
          </Button>

          <EditarVagaDialog vaga={vaga}>
            <Button size="sm" variant="outline" className="min-h-9 gap-1">
              <Pencil className="size-4" aria-hidden="true" /> {t("post.editar")}
            </Button>
          </EditarVagaDialog>

          {vaga.status === "aberta" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1"
                disabled={alterarStatus.isPending}
                onClick={() => alterarStatus.mutate("pausada")}
              >
                <Archive className="size-4" aria-hidden="true" /> {t("dashboard.vagaEmpresaCard.arquivar")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1"
                disabled={alterarStatus.isPending}
                onClick={() => alterarStatus.mutate("encerrada")}
              >
                <XCircle className="size-4" aria-hidden="true" /> {t("dashboard.vagaEmpresaCard.encerrar")}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="min-h-9 gap-1"
              disabled={alterarStatus.isPending}
              onClick={() => alterarStatus.mutate("aberta")}
            >
              <RotateCcw className="size-4" aria-hidden="true" /> {t("dashboard.vagaEmpresaCard.reabrir")}
            </Button>
          )}

          {vaga.status === "pausada" ? (
            <Button
              size="sm"
              variant="outline"
              className="min-h-9 gap-1"
              disabled={alterarStatus.isPending}
              onClick={() => alterarStatus.mutate("encerrada")}
            >
              <XCircle className="size-4" aria-hidden="true" /> {t("dashboard.vagaEmpresaCard.encerrar")}
            </Button>
          ) : null}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1 text-destructive hover:text-destructive"
                aria-label={`Excluir vaga ${vaga.titulo}`}
              >
                <Trash2 className="size-4" aria-hidden="true" /> {t("post.excluir")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("dashboard.vagaEmpresaCard.excluirEstaVaga")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("dashboard.vagaEmpresaCard.essaAcaoNaoPodeSerDesfeitaE")}
                  {vaga.totalCandidaturas ? t("dashboard.vagaEmpresaCard.estaVagaTemCandidaturaS", { var1: vaga.totalCandidaturas }) : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("post.cancelar")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => remover.mutate()}
                >
                  {t("dashboard.vagaEmpresaCard.excluirVaga")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
