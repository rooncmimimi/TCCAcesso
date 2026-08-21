import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { extrairMensagemErro } from "@/services/api";
import { perfilService } from "@/services/perfil.service";
import type { Candidato } from "@/types";

/**
 * Deficiências vinculadas ao candidato — "quando aplicável", conforme o próprio
 * candidato cadastra. Em modo leitura (perfil de outra pessoa), só lista, sem
 * ações de adicionar/remover.
 */
export function SecaoDeficiencias({
  candidato,
  somenteLeitura = false,
}: {
  candidato: Candidato;
  somenteLeitura?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [deficienciaId, setDeficienciaId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: catalogo } = useQuery({
    queryKey: ["deficiencias-catalogo"],
    queryFn: () => perfilService.catalogoDeficiencias(),
    enabled: aberto,
  });

  const vinculadas = candidato.deficiencias ?? [];
  const disponiveis = (catalogo ?? []).filter((d) => !vinculadas.some((v) => v.id === d.id));

  const adicionar = useMutation({
    mutationFn: (payload: { deficienciaId: string; observacoes?: string }) =>
      perfilService.adicionarDeficiencia(candidato.id, payload),
    onSuccess: () => {
      toast.success("Deficiência adicionada ao perfil.");
      void queryClient.invalidateQueries({ queryKey: ["meu-candidato"] });
      setAberto(false);
      setDeficienciaId("");
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível adicionar.")),
  });

  const remover = useMutation({
    mutationFn: (id: string) => perfilService.removerDeficiencia(candidato.id, id),
    onSuccess: () => {
      toast.success("Deficiência removida do perfil.");
      void queryClient.invalidateQueries({ queryKey: ["meu-candidato"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível remover.")),
  });

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!deficienciaId) return;
    const dados = new FormData(evento.currentTarget);
    adicionar.mutate({
      deficienciaId,
      observacoes: String(dados.get("observacoes") ?? "").trim() || undefined,
    });
  }

  if (somenteLeitura && vinculadas.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="secao-deficiencias" className="border-t pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="secao-deficiencias" className="text-lg font-bold">
          Informações de acessibilidade
        </h2>
        {somenteLeitura ? null : (
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="min-h-9 gap-1">
                <Plus className="size-4" aria-hidden="true" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar deficiência ao perfil</DialogTitle>
              </DialogHeader>
              <form onSubmit={enviar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deficienciaId">Deficiência</Label>
                  <Select value={deficienciaId} onValueChange={setDeficienciaId}>
                    <SelectTrigger id="deficienciaId">
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent>
                      {disponiveis.length === 0 ? (
                        <SelectItem value="_vazio" disabled>
                          Nenhuma opção disponível
                        </SelectItem>
                      ) : (
                        disponiveis.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações (opcional)</Label>
                  <Textarea id="observacoes" name="observacoes" rows={3} maxLength={1000} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!deficienciaId || adicionar.isPending} className="min-h-11 gap-2">
                    {adicionar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {vinculadas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma informação de acessibilidade cadastrada. Adicionar é opcional e ajuda empresas a oferecer os
          recursos certos.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {vinculadas.map((d) => (
            <li key={d.id}>
              <Badge variant="secondary" className="min-h-9 gap-2 px-3 text-sm font-semibold">
                {d.nome}
                {somenteLeitura ? null : (
                  <button
                    type="button"
                    aria-label={`Remover ${d.nome}`}
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => remover.mutate(d.id)}
                    disabled={remover.isPending}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
