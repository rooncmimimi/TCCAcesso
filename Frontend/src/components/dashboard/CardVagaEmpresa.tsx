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
import { useSpeech } from "@/contexts/SpeechContext";
import { formatarData, formatarSalario } from "@/utils/format";
import { ROTULO_CONTRATO } from "./constantesVaga";
import { EditarVagaDialog } from "./EditarVagaDialog";
import type { ContratoVaga, StatusVaga, Vaga } from "@/types";

const MENSAGEM_STATUS: Record<StatusVaga, string> = {
  Aberta: "Vaga reaberta.",
  Pausada: "Vaga arquivada.",
  Encerrada: "Vaga encerrada.",
};

/** Card de gestão de uma vaga: dados principais + ações (editar, arquivar, reabrir, encerrar, excluir). */
export function CardVagaEmpresa({
  vaga,
  selecionada,
  onVerCandidaturas,
}: {
  vaga: Vaga;
  selecionada: boolean;
  onVerCandidaturas: (vaga: Vaga) => void;
}) {
  const queryClient = useQueryClient();
  const { speak } = useSpeech();

  const invalidarListas = () => {
    void queryClient.invalidateQueries({ queryKey: ["minhas-vagas"] });
    void queryClient.invalidateQueries({ queryKey: ["metricas-empresa"] });
    void queryClient.invalidateQueries({ queryKey: ["vaga", vaga.id] });
  };

  const alterarStatus = useMutation({
    mutationFn: (status: StatusVaga) => vagasService.alterarStatus(vaga.id, status),
    onSuccess: (_dados, status) => {
      toast.success(MENSAGEM_STATUS[status]);
      speak(MENSAGEM_STATUS[status]);
      invalidarListas();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível alterar o status da vaga.")),
  });

  const remover = useMutation({
    mutationFn: () => vagasService.remover(vaga.id),
    onSuccess: () => {
      toast.success("Vaga excluída.");
      speak("Vaga excluída.");
      invalidarListas();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível excluir a vaga.")),
  });

  const local = [vaga.cidade, vaga.estado].filter(Boolean).join(" - ");
  const dataPublicacao = vaga.dataPublicacao ?? vaga.createdAt;

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
            {dataPublicacao ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" aria-hidden="true" /> Publicada em {formatarData(dataPublicacao)}
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
            <Users className="size-4" aria-hidden="true" /> Candidaturas
          </Button>

          <Button asChild size="sm" variant="outline" className="min-h-9 gap-1">
            <Link to="/vaga/$vagaId" params={{ vagaId: vaga.id }}>
              <Eye className="size-4" aria-hidden="true" /> Ver detalhes
            </Link>
          </Button>

          <EditarVagaDialog vaga={vaga}>
            <Button size="sm" variant="outline" className="min-h-9 gap-1">
              <Pencil className="size-4" aria-hidden="true" /> Editar
            </Button>
          </EditarVagaDialog>

          {vaga.status === "Aberta" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1"
                disabled={alterarStatus.isPending}
                onClick={() => alterarStatus.mutate("Pausada")}
              >
                <Archive className="size-4" aria-hidden="true" /> Arquivar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1"
                disabled={alterarStatus.isPending}
                onClick={() => alterarStatus.mutate("Encerrada")}
              >
                <XCircle className="size-4" aria-hidden="true" /> Encerrar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="min-h-9 gap-1"
              disabled={alterarStatus.isPending}
              onClick={() => alterarStatus.mutate("Aberta")}
            >
              <RotateCcw className="size-4" aria-hidden="true" /> Reabrir
            </Button>
          )}

          {vaga.status === "Pausada" ? (
            <Button
              size="sm"
              variant="outline"
              className="min-h-9 gap-1"
              disabled={alterarStatus.isPending}
              onClick={() => alterarStatus.mutate("Encerrada")}
            >
              <XCircle className="size-4" aria-hidden="true" /> Encerrar
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
                <Trash2 className="size-4" aria-hidden="true" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir esta vaga?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita e pode afetar dados relacionados à vaga, como candidaturas recebidas.
                  {vaga.totalCandidaturas ? ` Esta vaga tem ${vaga.totalCandidaturas} candidatura(s) registrada(s).` : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => remover.mutate()}
                >
                  Excluir vaga
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
