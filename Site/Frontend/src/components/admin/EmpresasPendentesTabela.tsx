import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Building2, Check, RotateCcw, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { extrairMensagemErro } from "@/services/api";
import {
  aprovarEmpresa,
  listarEmpresas,
  reativarEmpresa,
  reprovarEmpresa,
  suspenderEmpresa,
  type EmpresaAdmin,
} from "@/services/admin.service";

type Acao = "aprovar" | "reprovar" | "suspender" | "reativar";

const TOM: Record<EmpresaAdmin["statusAprovacao"], "sucesso" | "atencao" | "perigo"> = {
  aprovada: "sucesso",
  pendente: "atencao",
  reprovada: "perigo",
  suspensa: "perigo",
};

const ROTULO: Record<EmpresaAdmin["statusAprovacao"], string> = {
  aprovada: "Aprovada",
  pendente: "Pendente",
  reprovada: "Reprovada",
  suspensa: "Suspensa",
};

export function EmpresasPendentesTabela() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<{ empresa: EmpresaAdmin; acao: Acao } | null>(null);
  const [motivo, setMotivo] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "empresas", pagina],
    queryFn: () => listarEmpresas({ page: pagina, limit: 10 }),
  });

  const mutacao = useMutation({
    mutationFn: (payload: { id: string; acao: Acao }) => {
      switch (payload.acao) {
        case "aprovar":
          return aprovarEmpresa(payload.id);
        case "reprovar":
          return reprovarEmpresa(payload.id, motivo || undefined);
        case "suspender":
          return suspenderEmpresa(payload.id, motivo || undefined);
        case "reativar":
          return reativarEmpresa(payload.id);
      }
    },
    onSuccess: (_dados, payload) => {
      const mensagens: Record<Acao, string> = {
        aprovar: "Empresa aprovada.",
        reprovar: "Empresa reprovada.",
        suspender: "Empresa suspensa.",
        reativar: "Empresa reativada.",
      };
      toast.success(mensagens[payload.acao]);
      queryClient.invalidateQueries({ queryKey: ["admin", "empresas"] });
      setAlvo(null);
      setMotivo("");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Skeleton key={indice} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar as empresas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const empresas = data?.empresas ?? [];

  if (empresas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Building2 className="size-8" aria-hidden="true" />
        <p className="text-sm">Nenhuma empresa cadastrada até o momento.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <caption className="sr-only">Empresas cadastradas e situação da aprovação</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell className="font-medium">
                {empresa.nomeFantasia || empresa.razaoSocial}
              </TableCell>
              <TableCell>{empresa.cnpj || "—"}</TableCell>
              <TableCell>
                {[empresa.cidade, empresa.estado].filter(Boolean).join("/") || "—"}
              </TableCell>
              <TableCell>
                <StatusBadge tom={TOM[empresa.statusAprovacao] ?? "neutro"}>
                  {ROTULO[empresa.statusAprovacao] ?? empresa.statusAprovacao}
                </StatusBadge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {empresa.statusAprovacao === "suspensa" ? (
                    <Button
                      size="sm"
                      onClick={() => setAlvo({ empresa, acao: "reativar" })}
                      aria-label={`Reativar ${empresa.razaoSocial}`}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" /> Reativar
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={empresa.statusAprovacao === "aprovada"}
                        onClick={() => setAlvo({ empresa, acao: "aprovar" })}
                        aria-label={`Aprovar ${empresa.razaoSocial}`}
                      >
                        <Check className="size-4" aria-hidden="true" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={empresa.statusAprovacao === "reprovada"}
                        onClick={() => setAlvo({ empresa, acao: "reprovar" })}
                        aria-label={`Reprovar ${empresa.razaoSocial}`}
                      >
                        <X className="size-4" aria-hidden="true" /> Reprovar
                      </Button>
                      {empresa.statusAprovacao === "aprovada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setAlvo({ empresa, acao: "suspender" })}
                          aria-label={`Suspender ${empresa.razaoSocial}`}
                        >
                          <Ban className="size-4" aria-hidden="true" /> Suspender
                        </Button>
                      )}
                    </>
                  )}
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

      <ConfirmarAcaoDialog
        open={Boolean(alvo)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setAlvo(null);
            setMotivo("");
          }
        }}
        titulo={
          {
            aprovar: "Aprovar empresa",
            reprovar: "Reprovar empresa",
            suspender: "Suspender empresa",
            reativar: "Reativar empresa",
          }[alvo?.acao ?? "aprovar"]
        }
        descricao={
          <div className="space-y-3">
            <p>
              Confirma{" "}
              {
                {
                  aprovar: "aprovar",
                  reprovar: "reprovar",
                  suspender: "suspender",
                  reativar: "reativar",
                }[alvo?.acao ?? "aprovar"]
              }{" "}
              o cadastro de &quot;{alvo?.empresa.nomeFantasia || alvo?.empresa.razaoSocial}&quot;?
            </p>
            {(alvo?.acao === "reprovar" || alvo?.acao === "suspender") && (
              <div>
                <Label htmlFor="motivo-empresa">Motivo (opcional)</Label>
                <Textarea
                  id="motivo-empresa"
                  value={motivo}
                  onChange={(evento) => setMotivo(evento.target.value)}
                  className="mt-1 min-h-20 resize-none"
                />
              </div>
            )}
          </div>
        }
        textoConfirmar={
          {
            aprovar: "Aprovar",
            reprovar: "Reprovar",
            suspender: "Suspender",
            reativar: "Reativar",
          }[alvo?.acao ?? "aprovar"]
        }
        destrutivo={alvo?.acao === "reprovar" || alvo?.acao === "suspender"}
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate({ id: alvo.empresa.id, acao: alvo.acao })}
      />
    </div>
  );
}
