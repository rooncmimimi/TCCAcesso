import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChaveBase } from "@/i18n/dicionarios";
import { useIdioma } from "@/hooks/useIdioma";
import { StatusBadge } from "@/components/StatusBadge";
import { BotoesCurriculo } from "@/components/perfil/BotoesCurriculo";
import { AdaptacoesPedidasEmpresa } from "@/components/candidatura/AdaptacoesPedidasEmpresa";
import { candidaturasService } from "@/services/dashboard.service";
import type { AdaptacoesDaEmpresa } from "@/types/adaptacoes";
import type { StatusCandidatura, Vaga } from "@/types";

const OPCOES_STATUS: StatusCandidatura[] = ["pendente", "em_analise", "aprovada", "rejeitada"];

const ROTULOS: Record<string, ChaveBase> = {
  pendente: "status.pendente",
  em_analise: "status.emAnalise",
  aprovada: "status.aprovada",
  rejeitada: "status.rejeitada",
};

/** Candidaturas recebidas para uma vaga específica, com atualização de status. */
export function CandidaturasDaVaga({ vaga }: { vaga: Vaga }) {
  const { t } = useIdioma();
  const [pagina, setPagina] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidaturas-da-vaga", vaga.id, pagina],
    queryFn: () => candidaturasService.daVaga(vaga.id, { page: pagina, limit: 6 }),
  });

  const atualizar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      candidaturasService.atualizarStatus(id, status),
    onSuccess: () => {
      toast.success(t("dashboard.candidaturasDaVaga.statusDaCandidaturaAtualizado"));
      queryClient.invalidateQueries({ queryKey: ["candidaturas-da-vaga", vaga.id] });
      queryClient.invalidateQueries({ queryKey: ["metricas-empresa"] });
    },
    onError: () => toast.error(t("dashboard.candidaturasDaVaga.naoFoiPossivelAtualizarOStatus")),
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-lg">Candidaturas para "{vaga.titulo}"</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t("dashboard.candidaturasDaVaga.carregandoCandidaturas")}
          </div>
        ) : isError ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>{t("dashboard.candidaturasDaVaga.naoFoiPossivelCarregarAs")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t("raiz.tentarNovamente")}
            </Button>
          </div>
        ) : !data || data.dados.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{t("dashboard.candidaturasDaVaga.nenhumaCandidaturaRecebidaPara")}</p>
        ) : (
          <>
            <ul className="divide-y">
              {data.dados.map((candidatura) => (
                <li key={candidatura.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {candidatura.candidato?.usuario?.nome ?? "Candidato"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {candidatura.candidato?.tituloProfissional ?? t("dashboard.candidaturasDaVaga.semTituloInformado")}
                    </p>
                    {/* `curriculoNome` só vem preenchido quando o backend já
                        confirmou que esta empresa está autorizada (tem
                        candidatura do candidato numa vaga própria); nunca
                        reimplementa essa checagem aqui. */}
                    {candidatura.candidato?.id && candidatura.candidato?.curriculoNome ? (
                      <div className="mt-2">
                        <BotoesCurriculo candidatoId={candidatura.candidato.id} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={candidatura.status} />
                    <label className="sr-only" htmlFor={`status-${candidatura.id}`}>
                      Atualizar status da candidatura de {candidatura.candidato?.usuario?.nome ?? "candidato"}
                    </label>
                    <Select
                      value={candidatura.status}
                      onValueChange={(status) => atualizar.mutate({ id: candidatura.id, status })}
                    >
                      <SelectTrigger id={`status-${candidatura.id}`} className="min-h-11 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCOES_STATUS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(ROTULOS[status])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {candidatura.adaptacoes ? (
                    <AdaptacoesPedidasEmpresa
                      candidaturaId={candidatura.id}
                      nome={candidatura.candidato?.usuario?.nome ?? "candidato"}
                      adaptacoes={candidatura.adaptacoes as AdaptacoesDaEmpresa}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
            {data.totalPaginas > 1 ? (
              <div className="mt-4 flex justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  {t("vagas.paginaAnterior")}
                </Button>
                <span className="self-center text-sm text-muted-foreground">
                  Página {data.pagina} de {data.totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= data.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  {t("vagas.proximaPagina")}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
