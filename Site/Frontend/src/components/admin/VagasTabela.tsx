import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Briefcase, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIdioma } from "@/hooks/useIdioma";
import { Button } from "@/components/ui/button";
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
import { VerificarMapaFisicoDialog } from "@/components/admin/VerificarMapaFisicoDialog";
import { resumoDoMapa, textoDoResumo } from "@/lib/mapaFisicoAdmin";
import { useSessao } from "@/hooks/useSessao";
import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";
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
  const { t } = useIdioma();
  const { usuario } = useSessao();

  const queryClient = useQueryClient();

  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<VagaAdmin | null>(null);
  const [mapaId, setMapaId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "vagas", pagina],
    queryFn: () => listarVagas({ page: pagina, limit: 10 }),
    enabled: Boolean(usuario),
  });

  const statusMutacao = useMutation({
    mutationFn: (payload: { id: string; status: VagaAdmin["status"] }) =>
      alterarStatusVaga(payload.id, payload.status),
    onSuccess: () => {
      toast.success("Status da vaga atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível atualizar o status."),
  });

  const remocaoMutacao = useMutation({
    mutationFn: (vaga: VagaAdmin) => removerVaga(vaga.id),
    onSuccess: () => {
      toast.success("Vaga removida.");
      queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
      setAlvo(null);
    },
    onError: (erro: Error) => toast.error(erro.message || "Não foi possível remover a vaga."),
  });

  if (isLoading) {
    return (
      <ListaCarregando rotulo={t("admin.vagasTabela.carregandoAsVagas")} linhas={5} />
    );
  }

  if (isError) {
    return (
      <ListaComErro mensagem={t("vagas.erro")} aoTentarDeNovo={() => refetch()} />
    );
  }

  const vagas = data?.vagas ?? [];

  if (vagas.length === 0) {
    return (
      <ListaVazia icone={Briefcase} mensagem={t("admin.vagasTabela.nenhumaVagaPublicadaAteO")} />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.vagasTabela.vaga")}</TableHead>
            <TableHead>{t("admin.vagasTabela.local")}</TableHead>
            <TableHead>{t("admin.vagasTabela.situacao")}</TableHead>
            <TableHead>{t("admin.vagasTabela.alterarStatus")}</TableHead>
            <TableHead className="text-right">{t("admin.vagasTabela.acoes")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vagas.map((vaga) => (
            <TableRow key={vaga.id}>
              <TableCell className="font-medium">
                {vaga.titulo}
                <span className="block text-xs font-normal text-muted-foreground">{textoDoResumo(resumoDoMapa(vaga.acessibilidadeFisica))}</span>
              </TableCell>
              <TableCell>
                {[vaga.cidade, vaga.estado].filter(Boolean).join("/") || vaga.modalidade || "—"}
              </TableCell>
              <TableCell>
                <StatusBadge tom={TOM[vaga.status]}>{vaga.status}</StatusBadge>
              </TableCell>
              <TableCell>
                <Select
                  value={vaga.status}
                  onValueChange={(valor) =>
                    statusMutacao.mutate({ id: vaga.id, status: valor as VagaAdmin["status"] })
                  }
                >
                  <SelectTrigger className="w-36" aria-label={`Alterar status da vaga ${vaga.titulo}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setMapaId(vaga.id)}
                  aria-label={`Verificar o mapa de acessibilidade física da vaga ${vaga.titulo}`}
                >
                  <BadgeCheck className="size-4" aria-hidden="true" /> Mapa físico
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAlvo(vaga)}
                  aria-label={`Remover vaga ${vaga.titulo}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Remover
                </Button>
                </div>
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

      <VerificarMapaFisicoDialog vaga={vagas.find((v) => v.id === mapaId) ?? null} aoFechar={() => setMapaId(null)} />

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo={t("admin.vagasTabela.removerVaga")}
        descricao={`A vaga "${alvo?.titulo}" será removida da plataforma. Deseja continuar?`}
        textoConfirmar={t("admin.vagasTabela.remover")}
        destrutivo
        carregando={remocaoMutacao.isPending}
        onConfirmar={() => alvo && remocaoMutacao.mutate(alvo)}
      />
    </div>
  );
}
