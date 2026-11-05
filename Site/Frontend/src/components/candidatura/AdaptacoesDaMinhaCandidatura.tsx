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
        O que você compartilhou com esta empresa
      </h4>
      <p className="text-xs text-muted-foreground">
        Autorizado em {formatarData(adaptacoes.autorizadoEm)} (versão {adaptacoes.versao}), só para o processo seletivo desta vaga.
      </p>
      <CopiaCompartilhadaLista itens={adaptacoes.itens} />

      {adaptacoes.resposta ? (
        <p role="status" className="rounded-md border border-primary/40 bg-primary-soft/40 p-2 text-sm">
          <strong>Resposta da empresa:</strong> {rotuloDaResposta(adaptacoes.resposta)}.{adaptacoes.respostaMensagem ? ` “${adaptacoes.respostaMensagem}”` : ""}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">A empresa ainda não respondeu ao seu pedido.</p>
      )}

      {podeAlterar ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setEditando(true)}>
            Alterar o que compartilho
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" variant="ghost" className="min-h-11 text-destructive hover:text-destructive" disabled={retirar.isPending}>
                Retirar autorização
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retirar a autorização?</AlertDialogTitle>
                <AlertDialogDescription>
                  A empresa não poderá mais consultar essas informações e o conteúdo será apagado do ACESSO. Se ela já tiver lido ou copiado, isso não pode ser desfeito. A sua candidatura continua.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => retirar.mutate()}>Retirar autorização</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}

      <EditarAdaptacoesDialog candidaturaId={candidaturaId} vagaId={vagaId} tituloDaVaga={tituloDaVaga} atual={adaptacoes.itens} aberto={editando} aoFechar={() => setEditando(false)} />
    </section>
  );
}
