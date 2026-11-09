import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EscolhaDeAdaptacoes } from "@/components/candidatura/EscolhaDeAdaptacoes";
import { PreviaDePrivacidade } from "@/components/candidatura/PreviaDePrivacidade";
import { candidaturaAdaptacoesService, minhaAcessibilidadeService } from "@/services/adaptacoes.service";
import { extrairMensagemErro } from "@/services/api";
import { escolhaDaCopia, escolhaTemConteudo, escolhaVazia, type CopiaCompartilhada, type EscolhaDeCompartilhamento } from "@/types/adaptacoes";
import { useIdioma } from "@/hooks/useIdioma";

type Props = {
  candidaturaId: string;
  vagaId: string;
  tituloDaVaga: string;
  atual: CopiaCompartilhada | null;
  aberto: boolean;
  aoFechar: () => void;
};

/**
 * Alterar o que foi compartilhado numa candidatura que já foi enviada. Mostra a prévia do que a
 * empresa passará a ver e exige a autorização de novo: a alteração vira uma nova versão, e a
 * resposta antiga da empresa deixa de valer (era sobre o conteúdo anterior).
 */
export function EditarAdaptacoesDialog({ candidaturaId, vagaId, tituloDaVaga, atual, aberto, aoFechar }: Props) {
  const { t } = useIdioma();
  const queryClient = useQueryClient();
  const [escolha, setEscolha] = useState<EscolhaDeCompartilhamento>(escolhaVazia());
  const [aceita, setAceita] = useState(false);

  useEffect(() => {
    if (aberto) {
      setEscolha(escolhaDaCopia(atual));
      setAceita(false);
    }
  }, [aberto, atual]);

  const catalogo = useQuery({ queryKey: ["minha-acessibilidade", "catalogo"], queryFn: () => minhaAcessibilidadeService.catalogo(), enabled: aberto, staleTime: 60 * 60 * 1000 });
  const perfil = useQuery({ queryKey: ["minha-acessibilidade"], queryFn: () => minhaAcessibilidadeService.obter(), enabled: aberto });
  const previa = useQuery({
    queryKey: ["candidaturas", "previa", vagaId, JSON.stringify(escolha)],
    queryFn: () => candidaturaAdaptacoesService.previa(vagaId, escolha),
    enabled: aberto,
  });

  const salvar = useMutation({
    mutationFn: () => candidaturaAdaptacoesService.editar(candidaturaId, escolha, aceita),
    onSuccess: () => {
      toast.success(escolhaTemConteudo(escolha) ? "O que você compartilha nesta candidatura foi atualizado." : "Autorização retirada.");
      void queryClient.invalidateQueries({ queryKey: ["candidaturas"] });
      aoFechar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const tem = escolhaTemConteudo(escolha);

  return (
    <Dialog open={aberto} onOpenChange={(v) => (!v ? aoFechar() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alterar o que compartilho: {tituloDaVaga}</DialogTitle>
          <DialogDescription>{t("candidatura.editarAdaptacoesDialog.aEmpresaPassaraAVerSoOQue")}</DialogDescription>
        </DialogHeader>

        {catalogo.isLoading || perfil.isLoading ? (
          <div role="status" className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando…
          </div>
        ) : !catalogo.data || !perfil.data ? (
          <p role="alert" className="text-sm text-destructive">
            {t("candidatura.editarAdaptacoesDialog.naoFoiPossivelCarregarAsOpcoes")}
          </p>
        ) : (
          <div className="space-y-5">
            <EscolhaDeAdaptacoes catalogo={catalogo.data} perfil={perfil.data} escolha={escolha} aoMudar={(p) => { setEscolha(p); setAceita(false); }} />

            <h3 className="text-sm font-bold">{t("candidatura.editarAdaptacoesDialog.oQueAEmpresaPassaraAReceber")}</h3>
            {previa.data ? <PreviaDePrivacidade previa={previa.data} /> : <p role="status" className="text-sm text-muted-foreground">{t("candidatura.editarAdaptacoesDialog.montandoAPrevia")}</p>}

            {tem ? (
              <div className="flex items-start gap-3 rounded-lg border-2 border-primary p-3">
                <Checkbox id="editar-autorizo" className="mt-1" checked={aceita} onCheckedChange={(v) => setAceita(v === true)} />
                <Label htmlFor="editar-autorizo" className="text-sm font-semibold leading-snug">
                  {t("candidatura.editarAdaptacoesDialog.autorizoCompartilharComEsta")}
                </Label>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || (tem && !aceita) || !previa.data}>
            {salvar.isPending ? "Salvando…" : tem ? "Salvar alteração" : "Retirar autorização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
