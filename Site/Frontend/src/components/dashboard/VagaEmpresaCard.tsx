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
import { formatarData, formatarSalario } from "@/utils/formatacao";
import { useT } from "@/i18n";
import { EditarVagaDialog } from "./EditarVagaDialog";
import type { StatusVaga, Vaga } from "@/types";

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
  const t = useT();
  const td = t.dashboard.vagaCard;
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
      toast.success(td.statusAlterado[status]);
      invalidarListas();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, td.erroStatus)),
  });

  const remover = useMutation({
    mutationFn: () => vagasService.remover(vaga.id),
    onSuccess: () => {
      toast.success(td.excluida);
      invalidarListas();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, td.erroExcluir)),
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
              <span>{t.vagas.modalidade[vaga.modalidade] ?? vaga.modalidade}</span>
              {vaga.contrato ? <span>{t.vagas.contrato[vaga.contrato] ?? vaga.contrato}</span> : null}
              <span>{formatarSalario(typeof vaga.salario === "string" ? Number(vaga.salario) : vaga.salario)}</span>
            </p>
            {publicadaEm ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3.5 shrink-0" aria-hidden="true" /> {td.publicadaEm(formatarData(publicadaEm))}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={vaga.status} />
            <Badge variant="outline" className="gap-1 font-medium">
              <Users className="size-3.5" aria-hidden="true" /> {td.candidaturas(vaga.totalCandidaturas ?? 0)}
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
            <Users className="size-4" aria-hidden="true" /> {td.verCandidaturas}
          </Button>

          <Button asChild size="sm" variant="outline" className="min-h-9 gap-1">
            <Link to="/vaga/$vagaId" params={{ vagaId: vaga.id }}>
              <Eye className="size-4" aria-hidden="true" /> {td.verDetalhes}
            </Link>
          </Button>

          <EditarVagaDialog vaga={vaga}>
            <Button size="sm" variant="outline" className="min-h-9 gap-1">
              <Pencil className="size-4" aria-hidden="true" /> {td.editar}
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
                <Archive className="size-4" aria-hidden="true" /> {td.arquivar}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1"
                disabled={alterarStatus.isPending}
                onClick={() => alterarStatus.mutate("encerrada")}
              >
                <XCircle className="size-4" aria-hidden="true" /> {td.encerrar}
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
              <RotateCcw className="size-4" aria-hidden="true" /> {td.reabrir}
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
              <XCircle className="size-4" aria-hidden="true" /> {td.encerrar}
            </Button>
          ) : null}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="min-h-9 gap-1 text-destructive hover:text-destructive"
                aria-label={td.excluirAria(vaga.titulo)}
              >
                <Trash2 className="size-4" aria-hidden="true" /> {td.excluir}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{td.excluirTitulo}</AlertDialogTitle>
                <AlertDialogDescription>
                  {td.excluirTexto}
                  {vaga.totalCandidaturas ? td.excluirComCandidaturas(vaga.totalCandidaturas) : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.comum.cancelar}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => remover.mutate()}
                >
                  {td.excluirConfirmar}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
