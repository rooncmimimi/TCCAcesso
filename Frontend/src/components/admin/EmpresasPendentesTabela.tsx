import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Check, X } from "lucide-react";
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
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { extrairMensagemErro } from "@/services/api";
import {
  aprovarEmpresa,
  listarEmpresas,
  reprovarEmpresa,
  type EmpresaAdmin,
} from "@/services/admin.service";

const TOM: Record<EmpresaAdmin["statusAprovacao"], "sucesso" | "atencao" | "perigo"> = {
  aprovada: "sucesso",
  pendente: "atencao",
  reprovada: "perigo",
};

const ROTULO: Record<EmpresaAdmin["statusAprovacao"], string> = {
  aprovada: "Aprovada",
  pendente: "Pendente",
  reprovada: "Reprovada",
};

export function EmpresasPendentesTabela() {
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [alvo, setAlvo] = useState<{ empresa: EmpresaAdmin; acao: "aprovar" | "reprovar" } | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "empresas", pagina],
    queryFn: () => listarEmpresas({ page: pagina, limit: 10 }),
  });

  const mutacao = useMutation({
    mutationFn: (payload: { id: string; acao: "aprovar" | "reprovar" }) =>
      payload.acao === "aprovar" ? aprovarEmpresa(payload.id) : reprovarEmpresa(payload.id),
    onSuccess: (_dados, payload) => {
      toast.success(payload.acao === "aprovar" ? "Empresa aprovada." : "Empresa reprovada.");
      queryClient.invalidateQueries({ queryKey: ["admin", "empresas"] });
      setAlvo(null);
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
                <div className="flex justify-end gap-2">
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
        onOpenChange={(aberto) => !aberto && setAlvo(null)}
        titulo={alvo?.acao === "reprovar" ? "Reprovar empresa" : "Aprovar empresa"}
        descricao={`Confirma ${alvo?.acao === "reprovar" ? "reprovar" : "aprovar"} o cadastro de "${
          alvo?.empresa.nomeFantasia || alvo?.empresa.razaoSocial
        }"?`}
        textoConfirmar={alvo?.acao === "reprovar" ? "Reprovar" : "Aprovar"}
        destrutivo={alvo?.acao === "reprovar"}
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate({ id: alvo.empresa.id, acao: alvo.acao })}
      />
    </div>
  );
}
