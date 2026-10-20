import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { useSessao } from "@/hooks/useSessao";
import { dic, useT } from "@/i18n";
import { extrairMensagemErro } from "@/services/api";
import { rotuloOuValor } from "@/components/admin/rotulos";
import {
  alterarStatusVaga,
  listarVagas,
  removerVaga,
  type VagaAdmin,
} from "@/services/admin.service";

const STATUS: VagaAdmin["status"][] = ["aberta", "pausada", "encerrada"];

const TOM: Record<VagaAdmin["status"], "sucesso" | "atencao" | "neutro"> = {
  aberta: "sucesso",
  pausada: "atencao",
  encerrada: "neutro",
};

/** Vagas publicadas, com mudança de status e remoção pela moderação. */
export function VagasTabela() {
  const t = useT();
  const tv = t.admin.vagas;
  const { usuario } = useSessao();

  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<VagaAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "vagas", pagina],
    queryFn: () => listarVagas({ page: pagina, limit: 10 }),
    enabled: Boolean(usuario),
  });

  const statusMutacao = useMutation({
    mutationFn: (payload: { id: string; status: VagaAdmin["status"] }) =>
      alterarStatusVaga(payload.id, payload.status),
    onSuccess: () => {
      toast.success(dic().admin.vagas.statusAtualizado);
      queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.vagas.erroStatus)),
  });

  const remocaoMutacao = useMutation({
    mutationFn: (vaga: VagaAdmin) => removerVaga(vaga.id),
    onSuccess: () => {
      toast.success(dic().admin.vagas.removida);
      queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
      setAlvo(null);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.vagas.erroRemover)),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
        {Array.from({ length: 5 }).map((_, indice) => (
          <Skeleton key={indice} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">{tv.erro}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  const vagas = data?.vagas ?? [];

  if (vagas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Briefcase className="size-8" aria-hidden="true" />
        <p className="text-sm">{tv.vazio}</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tv.colunas.vaga}</TableHead>
            <TableHead>{tv.colunas.local}</TableHead>
            <TableHead>{tv.colunas.situacao}</TableHead>
            <TableHead>{tv.colunas.alterarStatus}</TableHead>
            <TableHead className="text-right">{t.admin.comum.acoes}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vagas.map((vaga) => (
            <TableRow key={vaga.id}>
              <TableCell className="font-medium">{vaga.titulo}</TableCell>
              <TableCell>
                {[vaga.cidade, vaga.estado].filter(Boolean).join("/") ||
                  (vaga.modalidade ? rotuloOuValor(t.vagas.modalidade, vaga.modalidade) : t.comum.semValor)}
              </TableCell>
              <TableCell>
                <StatusBadge tom={TOM[vaga.status]}>{rotuloOuValor(t.status, vaga.status)}</StatusBadge>
              </TableCell>
              <TableCell>
                <Select
                  value={vaga.status}
                  onValueChange={(valor) =>
                    statusMutacao.mutate({ id: vaga.id, status: valor as VagaAdmin["status"] })
                  }
                >
                  <SelectTrigger className="w-36" aria-label={tv.alterarStatusAria(vaga.titulo)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t.status[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAlvo(vaga)}
                  aria-label={tv.removerAria(vaga.titulo)}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> {t.admin.comum.remover}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PaginacaoTabela
        pagina={data?.pagina ?? 1}
        totalPaginas={data?.totalPaginas ?? 1}
        total={data?.total ?? 0}
        onPaginaChange={setPagina}
      />

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo={tv.dialogoRemover.titulo}
        descricao={tv.dialogoRemover.texto(alvo?.titulo ?? "")}
        textoConfirmar={t.admin.comum.remover}
        destrutivo
        carregando={remocaoMutacao.isPending}
        onConfirmar={() => alvo && remocaoMutacao.mutate(alvo)}
      />
    </div>
  );
}
