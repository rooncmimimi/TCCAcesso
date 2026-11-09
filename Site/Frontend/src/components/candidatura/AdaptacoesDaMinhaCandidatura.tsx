import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { useIdioma } from "@/hooks/useIdioma";
import { CopiaCompartilhadaLista } from "@/components/candidatura/CopiaCompartilhada";
import { EditarAdaptacoesDialog } from "@/components/candidatura/EditarAdaptacoesDialog";
import { candidaturaAdaptacoesService } from "@/services/adaptacoes.service";
import { extrairMensagemErro } from "@/services/api";
import { rotuloDaResposta, type AdaptacoesDoCandidato } from "@/types/adaptacoes";

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(document.documentElement.lang || "pt-BR") : "");

/**
 * O que EU autorizei compartilhar numa candidatura: a lista exata, a resposta da empresa (se
 * houver), e os dois controles que são só meus, alterar e retirar. Retirar apaga o conteúdo do
 * servidor e a empresa deixa de poder consultá-lo.
 */
export function AdaptacoesDaMinhaCandidatura({
  candidaturaId,
  vagaId,
  tituloDaVaga,
  adaptacoes,
  podeAlterar,
}: {
  candidaturaId: string;
  vagaId: string;
  tituloDaVaga: string;
  adaptacoes: AdaptacoesDoCandidato;
  /** Falso quando a candidatura já foi encerrada (cancelada ou rejeitada). */
  podeAlterar: boolean;
}) {
  const { t } = useIdioma();
  const idBase = useId();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);

  const retirar = useMutation({
    mutationFn: () => candidaturaAdaptacoesService.retirar(candidaturaId),
    onSuccess: () => {
      toast.success("Autorização retirada. A empresa não pode mais consultar essas informações.");
      void queryClient.invalidateQueries({ queryKey: ["candidaturas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  if (adaptacoes.estado === "retirada") {
    return (
      <p className="basis-full text-sm text-muted-foreground">
        Você retirou, em {formatarData(adaptacoes.retiradoEm)}, a autorização para compartilhar informações de acessibilidade nesta candidatura. A empresa não pode mais consultá-las.
      </p>
    );
  }

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="basis-full space-y-2 rounded-lg border bg-muted/30 p-3">
      <h4 id={`${idBase}-titulo`} className="text-sm font-bold">
        {t("candidatura.adaptacoesDaMinhaCandidatura.oQueVoceCompartilhouComEsta")}
      </h4>
      <p className="text-xs text-muted-foreground">
        Autorizado em {formatarData(adaptacoes.autorizadoEm)} (versão {adaptacoes.versao}), só para o processo seletivo desta vaga.
      </p>
      <CopiaCompartilhadaLista itens={adaptacoes.itens} />

      {adaptacoes.resposta ? (
        <p role="status" className="rounded-md border border-primary/40 bg-primary-soft/40 p-2 text-sm">
          <strong>{t("candidatura.adaptacoesDaMinhaCandidatura.respostaDaEmpresa")}</strong> {rotuloDaResposta(adaptacoes.resposta)}.{adaptacoes.respostaMensagem ? ` “${adaptacoes.respostaMensagem}”` : ""}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("candidatura.adaptacoesDaMinhaCandidatura.aEmpresaAindaNaoRespondeuAoSeu")}</p>
      )}

      {podeAlterar ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setEditando(true)}>
            {t("candidatura.adaptacoesDaMinhaCandidatura.alterarOQueCompartilho")}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="min-h-11 text-destructive hover:text-destructive" disabled={retirar.isPending}>
                {t("candidatura.adaptacoesDaMinhaCandidatura.retirarAutorizacao")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("candidatura.adaptacoesDaMinhaCandidatura.retirarAAutorizacao")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("candidatura.adaptacoesDaMinhaCandidatura.aEmpresaNaoPoderaMaisConsultar")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("auth.voltar")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => retirar.mutate()}>{t("candidatura.adaptacoesDaMinhaCandidatura.retirarAutorizacao")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}

      <EditarAdaptacoesDialog candidaturaId={candidaturaId} vagaId={vagaId} tituloDaVaga={tituloDaVaga} atual={adaptacoes.itens} aberto={editando} aoFechar={() => setEditando(false)} />
    </section>
  );
}
