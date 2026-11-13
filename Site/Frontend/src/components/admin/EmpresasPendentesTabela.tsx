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
import type { ChaveBase } from "@/i18n/dicionarios";

/** O verbo da acao, no idioma da tela. */
const ACAO_EM_PALAVRAS = {
  aprovar: "admin.empresasPendentesTabela.acaoAprovar",
  reprovar: "admin.empresasPendentesTabela.acaoReprovar",
  suspender: "admin.empresasPendentesTabela.acaoSuspender",
  reativar: "admin.empresasPendentesTabela.acaoReativar",
} as const satisfies Record<string, ChaveBase>;

import { useIdioma } from "@/hooks/useIdioma";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmarAcaoDialog } from "@/components/admin/ConfirmarAcaoDialog";
import { PaginacaoTabela } from "@/components/admin/PaginacaoTabela";
import { extrairMensagemErro } from "@/services/api";
import { ListaCarregando, ListaComErro, ListaVazia } from "@/components/ui/estados-de-lista";
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

const ROTULO: Record<EmpresaAdmin["statusAprovacao"], string> = {
  aprovada: "Aprovada",
  pendente: "Pendente",
  reprovada: "Reprovada",
  suspensa: "Suspensa",
};

/** Empresas cadastradas, com aprovar, reprovar, suspender, reativar e o selo de empresa verificada. */
export function EmpresasPendentesTabela() {
  const { t } = useIdioma();
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
      const mensagens: Record<Acao, string> = {
        aprovar: t("admin.empresasPendentesTabela.empresaAprovada"),
        reprovar: t("admin.empresasPendentesTabela.empresaReprovada"),
        suspender: t("admin.empresasPendentesTabela.empresaSuspensa"),
        reativar: t("admin.empresasPendentesTabela.empresaReativada"),
        verificar: t("admin.empresasPendentesTabela.empresaVerificada"),
        desverificar: t("admin.empresasPendentesTabela.seloDeVerificadaRemovido"),
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
      <ListaCarregando rotulo={t("admin.empresasPendentesTabela.carregandoAsEmpresas")} linhas={4} />
    );
  }

  if (isError) {
    return (
      <ListaComErro mensagem={t("admin.empresasPendentesTabela.naoFoiPossivelCarregarAs")} aoTentarDeNovo={() => refetch()} />
    );
  }

  const empresas = data?.empresas ?? [];

  if (empresas.length === 0) {
    return (
      <ListaVazia icone={Building2} mensagem={t("admin.empresasPendentesTabela.nenhumaEmpresaCadastradaAteO")} />
    );
  }

  return (
    <div>
      <Table>
        <caption className="sr-only">{t("admin.empresasPendentesTabela.empresasCadastradasESituacaoDa")}</caption>
        <TableHeader>
          <TableRow>
            <TableHead>{t("vaga.empresa")}</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>{t("admin.empresasPendentesTabela.cidadeUf")}</TableHead>
            <TableHead>{t("admin.empresasPendentesTabela.status")}</TableHead>
            <TableHead>{t("vaga.verificada")}</TableHead>
            <TableHead className="text-right">{t("admin.empresasPendentesTabela.acoes")}</TableHead>
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
              <TableCell>
                {empresa.empresaVerificada ? (
                  <StatusBadge tom="sucesso">
                    <BadgeCheck className="size-3.5" aria-hidden="true" /> {t("vaga.verificada")}
                  </StatusBadge>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("admin.empresasPendentesTabela.naoVerificada")}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {empresa.empresaVerificada ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAlvo({ empresa, acao: "desverificar" })}
                      aria-label={t("admin.empresasPendentesTabela.removerSeloDeVerificadaDe", { var1: empresa.razaoSocial })}
                    >
                      <BadgeX className="size-4" aria-hidden="true" /> {t("admin.empresasPendentesTabela.removerSelo")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAlvo({ empresa, acao: "verificar" })}
                      aria-label={`Verificar ${empresa.razaoSocial}`}
                    >
                      <BadgeCheck className="size-4" aria-hidden="true" /> {t("admin.empresasPendentesTabela.verificar")}
                    </Button>
                  )}
                  {empresa.statusAprovacao === "suspensa" ? (
                    <Button
                      size="sm"
                      onClick={() => setAlvo({ empresa, acao: "reativar" })}
                      aria-label={`Reativar ${empresa.razaoSocial}`}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" /> {t("admin.empresasPendentesTabela.reativar")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={empresa.statusAprovacao === "aprovada"}
                        onClick={() => setAlvo({ empresa, acao: "aprovar" })}
                        aria-label={`Aprovar ${empresa.razaoSocial}`}
                      >
                        <Check className="size-4" aria-hidden="true" /> {t("admin.empresasPendentesTabela.aprovar")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={empresa.statusAprovacao === "reprovada"}
                        onClick={() => setAlvo({ empresa, acao: "reprovar" })}
                        aria-label={`Reprovar ${empresa.razaoSocial}`}
                      >
                        <X className="size-4" aria-hidden="true" /> {t("admin.empresasPendentesTabela.reprovar")}
                      </Button>
                      {empresa.statusAprovacao === "aprovada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setAlvo({ empresa, acao: "suspender" })}
                          aria-label={`Suspender ${empresa.razaoSocial}`}
                        >
                          <Ban className="size-4" aria-hidden="true" /> {t("admin.empresasPendentesTabela.suspender")}
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
            aprovar: t("admin.empresasPendentesTabela.aprovarEmpresa"),
            reprovar: t("admin.empresasPendentesTabela.reprovarEmpresa"),
            suspender: t("admin.empresasPendentesTabela.suspenderEmpresa"),
            reativar: t("admin.empresasPendentesTabela.reativarEmpresa"),
            verificar: t("admin.empresasPendentesTabela.verificarEmpresa"),
            desverificar: t("admin.empresasPendentesTabela.removerSeloDeVerificada"),
          }[alvo?.acao ?? "aprovar"]
        }
        descricao={
          <div className="space-y-3">
            {alvo?.acao === "verificar" || alvo?.acao === "desverificar" ? (
              <p>
                {/* A frase inteira numa chave só, com o nome da empresa no meio: picada em pedaços, a
                    ordem das palavras quebrava em outro idioma. */}
                {alvo.acao === "verificar"
                  ? t("admin.empresasPendentesTabela.confirmaConcederOSeloDe", {
                      empresa: alvo?.empresa.nomeFantasia || alvo?.empresa.razaoSocial || "",
                    })
                  : t("admin.empresasPendentesTabela.confirmaRemoverOSeloDe", {
                      empresa: alvo?.empresa.nomeFantasia || alvo?.empresa.razaoSocial || "",
                    })}
              </p>
            ) : (
              <p>
                {t("admin.empresasPendentesTabela.confirmaOCadastroDe", {
                  acao: t(ACAO_EM_PALAVRAS[alvo?.acao as keyof typeof ACAO_EM_PALAVRAS] ?? "admin.empresasPendentesTabela.acaoAprovar"),
                  empresa: alvo?.empresa.nomeFantasia || alvo?.empresa.razaoSocial || "",
                })}
              </p>
            )}
            {(alvo?.acao === "reprovar" || alvo?.acao === "suspender") && (
              <div>
                <Label htmlFor="motivo-empresa">{t("admin.empresasPendentesTabela.motivoOpcional")}</Label>
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
            verificar: "Verificar",
            desverificar: t("admin.empresasPendentesTabela.removerSelo"),
          }[alvo?.acao ?? "aprovar"]
        }
        destrutivo={alvo?.acao === "reprovar" || alvo?.acao === "suspender" || alvo?.acao === "desverificar"}
        carregando={mutacao.isPending}
        onConfirmar={() => alvo && mutacao.mutate({ id: alvo.empresa.id, acao: alvo.acao })}
      />
    </div>
  );
}
