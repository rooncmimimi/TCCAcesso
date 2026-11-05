import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopiaCompartilhadaLista } from "@/components/candidatura/CopiaCompartilhada";
import { candidaturaAdaptacoesService } from "@/services/adaptacoes.service";
import { extrairMensagemErro } from "@/services/api";
import { RESPOSTAS_DA_EMPRESA, rotuloDaResposta, type AdaptacoesDaEmpresa, type RespostaDaEmpresa } from "@/types/adaptacoes";

/**
 * O que a pessoa candidata autorizou compartilhar com ESTA empresa, nesta candidatura, e o campo para
 * a empresa responder. O backend só entrega isto à empresa dona da vaga, com a candidatura ativa e
 * a autorização em pé; se a pessoa retirar, o componente simplesmente deixa de receber a cópia.
 */
export function AdaptacoesPedidasEmpresa({ candidaturaId, nome, adaptacoes, aoResponder }: { candidaturaId: string; nome: string; adaptacoes: AdaptacoesDaEmpresa; aoResponder?: () => void }) {
  const idBase = useId();
  const queryClient = useQueryClient();
  const [resposta, setResposta] = useState<RespostaDaEmpresa | "">(adaptacoes.resposta ?? "");
  const [mensagem, setMensagem] = useState(adaptacoes.respostaMensagem ?? "");

  const responder = useMutation({
    mutationFn: () => candidaturaAdaptacoesService.responder(candidaturaId, resposta as RespostaDaEmpresa, mensagem.trim()),
    onSuccess: () => {
      toast.success("Resposta enviada à pessoa candidata.");
      void queryClient.invalidateQueries({ queryKey: ["candidaturas-da-vaga"] });
      aoResponder?.();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="basis-full space-y-3 rounded-lg border-2 border-primary/40 bg-primary-soft/30 p-3">
      <h4 id={`${idBase}-titulo`} className="text-sm font-bold">
        Pedido de adaptação de {nome}
      </h4>
      <p className="text-xs text-muted-foreground">
        A pessoa autorizou compartilhar estas informações só nesta candidatura e só para o processo seletivo. Use-as apenas para isso e não as repasse.
      </p>
      <CopiaCompartilhadaLista itens={adaptacoes.itens} />

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (resposta) responder.mutate();
        }}
      >
        <fieldset className="space-y-1">
          <legend className="text-sm font-semibold">Sua resposta</legend>
          {RESPOSTAS_DA_EMPRESA.map((r) => (
            <label key={r.valor} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name={`${idBase}-resposta`} value={r.valor} checked={resposta === r.valor} onChange={() => setResposta(r.valor)} />
              {r.rotulo}
            </label>
          ))}
        </fieldset>

        <div className="space-y-1">
          <Label htmlFor={`${idBase}-mensagem`} className="text-sm">
            Mensagem (opcional)
          </Label>
          <Textarea id={`${idBase}-mensagem`} rows={2} maxLength={500} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
        </div>

        <Button type="submit" size="sm" className="min-h-11" disabled={!resposta || responder.isPending}>
          {responder.isPending ? "Enviando…" : adaptacoes.resposta ? "Atualizar resposta" : "Enviar resposta"}
        </Button>
        {adaptacoes.resposta ? (
          <p role="status" className="text-xs text-muted-foreground">
            Última resposta enviada: {rotuloDaResposta(adaptacoes.resposta)}.
          </p>
        ) : null}
      </form>
    </section>
  );
}
