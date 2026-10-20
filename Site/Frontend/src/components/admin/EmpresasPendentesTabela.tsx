import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, BadgeCheck, BadgeX, Building2, Check, RotateCcw, X } from "lucide-react";
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
import { rotuloOuValor } from "@/components/admin/rotulos";
import { dic, useT } from "@/i18n";
import { extrairMensagemErro } from "@/services/api";
import {
  aprovarEmpresa,
  listarEmpresas,
  reativarEmpresa,
  reprovarEmpresa,
  suspenderEmpresa,
  verificarEmpresa,
  type EmpresaAdmin,
} from "@/services/admin.service";

type Acao = "aprovar" | "reprovar" | "suspender" | "reativar" | "verificar" | "desverificar";

const TOM: Record<EmpresaAdmin["statusAprovacao"], "sucesso" | "atencao" | "perigo"> = {
  aprovada: "sucesso",
  pendente: "atencao",
  reprovada: "perigo",
  suspensa: "perigo",
};

/** Empresas cadastradas, com aprovar, reprovar, suspender, reativar e o selo de empresa verificada. */
export function EmpresasPendentesTabela() {
  const t = useT();
  const te = t.admin.empresas;
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
        case "verificar":
          return verificarEmpresa(payload.id, true);
        case "desverificar":
          return verificarEmpresa(payload.id, false);
      }
    },
    onSuccess: (_dados, payload) => {
      toast.success(dic().admin.empresas.sucesso[payload.acao]);
      queryClient.invalidateQueries({ queryKey: ["admin", "empresas"] });
      setAlvo(null);
      setMotivo("");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, dic().admin.comum.erroAcao)),
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
        <p className="text-sm text-muted-foreground">{te.erro}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t.comum.tentarNovamente}
        </Button>
      </div>
    );
  }

  const empresas = data?.empresas ?? [];

  if (empresas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
        <Building2 className="size-8" aria-hidden="true" />
        <p className="text-sm">{te.vazio}</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <caption className="sr-only">{te.caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{te.colunas.empresa}</TableHead>
            <TableHead>{te.colunas.cnpj}</TableHead>
            <TableHead>{te.colunas.cidadeUf}</TableHead>
            <TableHead>{te.colunas.status}</TableHead>
            <TableHead>{te.colunas.verificada}</TableHead>
            <TableHead className="text-right">{t.admin.comum.acoes}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((empresa) => (
            <TableRow key={empresa.id}>
              <TableCell className="font-medium">
                {empresa.nomeFantasia || empresa.razaoSocial}
              </TableCell>
              <TableCell>{empresa.cnpj || t.comum.semValor}</TableCell>
              <TableCell>
                {[empresa.cidade, empresa.estado].filter(Boolean).join("/") || t.comum.semValor}
              </TableCell>
              <TableCell>
                <StatusBadge tom={TOM[empresa.statusAprovacao] ?? "neutro"}>
                  {rotuloOuValor(te.status, empresa.statusAprovacao)}
                </StatusBadge>
              </TableCell>
              <TableCell>
                {empresa.empresaVerificada ? (
                  <StatusBadge tom="sucesso">
                    <BadgeCheck className="size-3.5" aria-hidden="true" /> {te.verificada}
                  </StatusBadge>
                ) : (
                  <span className="text-sm text-muted-foreground">{te.naoVerificada}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {empresa.empresaVerificada ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAlvo({ empresa, acao: "desverificar" })}
                      aria-label={te.acaoAria.desverificar(empresa.razaoSocial)}
                    >
                      <BadgeX className="size-4" aria-hidden="true" /> {te.acoes.desverificar}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAlvo({ empresa, acao: "verificar" })}
                      aria-label={te.acaoAria.verificar(empresa.razaoSocial)}
                    >
                      <BadgeCheck className="size-4" aria-hidden="true" /> {te.acoes.verificar}
                    </Button>
                  )}
                  {empresa.statusAprovacao === "suspensa" ? (
                    <Button
                      size="sm"
                      onClick={() => setAlvo({ empresa, acao: "reativar" })}
                      aria-label={te.acaoAria.reativar(empresa.razaoSocial)}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" /> {te.acoes.reativar}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={empresa.statusAprovacao === "aprovada"}
                        onClick={() => setAlvo({ empresa, acao: "aprovar" })}
                        aria-label={te.acaoAria.aprovar(empresa.razaoSocial)}
                      >
                        <Check className="size-4" aria-hidden="true" /> {te.acoes.aprovar}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={empresa.statusAprovacao === "reprovada"}
                        onClick={() => setAlvo({ empresa, acao: "reprovar" })}
                        aria-label={te.acaoAria.reprovar(empresa.razaoSocial)}
                      >
                        <X className="size-4" aria-hidden="true" /> {te.acoes.reprovar}
                      </Button>
                      {empresa.statusAprovacao === "aprovada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setAlvo({ empresa, acao: "suspender" })}
                          aria-label={te.acaoAria.suspender(empresa.razaoSocial)}
                        >
                          <Ban className="size-4" aria-hidden="true" /> {te.acoes.suspender}
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
        titulo={te.dialogo.titulo[alvo?.acao ?? "aprovar"]}
        descricao={
          <div className="space-y-3">
            {alvo ? (
              <p>{te.dialogo.confirma[alvo.acao](alvo.empresa.nomeFantasia || alvo.empresa.razaoSocial)}</p>
            ) : null}
            {(alvo?.acao === "reprovar" || alvo?.acao === "suspender") && (
              <div>
                <Label htmlFor="motivo-empresa">{te.dialogo.motivo}</Label>
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
        textoConfirmar={te.acoes[alvo?.acao ?? "aprovar"]}
        destrutivo={alvo?.acao === "reprovar" || alvo?.acao === "suspender" || alvo?.acao === "desverificar"}
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate({ id: alvo.empresa.id, acao: alvo.acao })}
      />
    </div>
  );
}
