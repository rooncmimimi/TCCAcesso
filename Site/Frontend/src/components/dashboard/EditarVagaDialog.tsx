import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { extrairMensagemErro } from "@/services/api";
import vagasService from "@/services/vagas.service";
import { useSpeech } from "@/contexts/SpeechContext";
import { CONTRATOS, MODALIDADES, ROTULO_CONTRATO } from "./constantesVaga";
import type { Vaga } from "@/types";

/**
 * Edição de uma vaga já publicada (PUT /vagas/:id). Mesmos campos e limites
 * do formulário de criação — o backend já valida posse e aprovação da
 * empresa (`garantirDono` + `garantirEmpresaAprovada`).
 */
export function EditarVagaDialog({ vaga, children }: { vaga: Vaga; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [exclusivaPcd, setExclusivaPcd] = useState(Boolean(vaga.exclusivaPcd));
  const queryClient = useQueryClient();
  const { speak } = useSpeech();

  const salvar = useMutation({
    mutationFn: (payload: Record<string, unknown>) => vagasService.atualizar(vaga.id, payload),
    onSuccess: () => {
      toast.success("Vaga atualizada com sucesso.");
      speak("Vaga atualizada.");
      setAberto(false);
      void queryClient.invalidateQueries({ queryKey: ["minhas-vagas"] });
      void queryClient.invalidateQueries({ queryKey: ["vaga", vaga.id] });
      void queryClient.invalidateQueries({ queryKey: ["vagas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível atualizar a vaga.")),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const texto = (chave: string) => String(dados.get(chave) ?? "").trim();

    salvar.mutate({
      titulo: texto("titulo"),
      descricao: texto("descricao"),
      requisitos: texto("requisitos") || null,
      beneficios: texto("beneficios") || null,
      salario: texto("salario") || null,
      modalidade: texto("modalidade"),
      contrato: texto("contrato"),
      cidade: texto("cidade") || null,
      estado: texto("estado").toUpperCase() || null,
      cargaHoraria: texto("cargaHoraria") || null,
      acessibilidade: texto("acessibilidade") || null,
      exclusivaPcd,
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar vaga</DialogTitle>
          <DialogDescription>Atualize as informações desta vaga.</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`titulo-${vaga.id}`}>Título da vaga</Label>
            <Input
              id={`titulo-${vaga.id}`}
              name="titulo"
              required
              minLength={5}
              maxLength={200}
              defaultValue={vaga.titulo}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`descricao-${vaga.id}`}>Descrição</Label>
            <Textarea
              id={`descricao-${vaga.id}`}
              name="descricao"
              required
              minLength={20}
              rows={5}
              defaultValue={vaga.descricao}
            />
            <p className="text-xs text-muted-foreground">Mínimo de 20 caracteres.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`requisitos-${vaga.id}`}>Requisitos</Label>
              <Textarea id={`requisitos-${vaga.id}`} name="requisitos" rows={3} defaultValue={vaga.requisitos ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`beneficios-${vaga.id}`}>Benefícios</Label>
              <Textarea id={`beneficios-${vaga.id}`} name="beneficios" rows={3} defaultValue={vaga.beneficios ?? ""} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`modalidade-${vaga.id}`}>Modalidade</Label>
              <select
                id={`modalidade-${vaga.id}`}
                name="modalidade"
                defaultValue={vaga.modalidade}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {MODALIDADES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contrato-${vaga.id}`}>Contrato</Label>
              <select
                id={`contrato-${vaga.id}`}
                name="contrato"
                defaultValue={vaga.contrato ?? "CLT"}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CONTRATOS.map((c) => (
                  <option key={c} value={c}>
                    {ROTULO_CONTRATO[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`salario-${vaga.id}`}>Salário (R$)</Label>
              <Input
                id={`salario-${vaga.id}`}
                name="salario"
                inputMode="decimal"
                placeholder="2500.00"
                defaultValue={vaga.salario ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`cidade-${vaga.id}`}>Cidade</Label>
              <Input id={`cidade-${vaga.id}`} name="cidade" maxLength={100} defaultValue={vaga.cidade ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`estado-${vaga.id}`}>Estado (UF)</Label>
              <Input
                id={`estado-${vaga.id}`}
                name="estado"
                maxLength={2}
                placeholder="SP"
                defaultValue={vaga.estado ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cargaHoraria-${vaga.id}`}>Carga horária</Label>
              <Input
                id={`cargaHoraria-${vaga.id}`}
                name="cargaHoraria"
                placeholder="40h semanais"
                defaultValue={vaga.cargaHoraria ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`acessibilidade-${vaga.id}`}>Recursos de acessibilidade</Label>
            <Textarea
              id={`acessibilidade-${vaga.id}`}
              name="acessibilidade"
              rows={3}
              placeholder="Ex.: rampas, elevador, leitor de tela, intérprete de Libras"
              defaultValue={vaga.acessibilidade ?? ""}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor={`exclusivaPcd-${vaga.id}`} className="cursor-pointer">
              Vaga exclusiva para pessoas com deficiência
            </Label>
            <Switch id={`exclusivaPcd-${vaga.id}`} checked={exclusivaPcd} onCheckedChange={setExclusivaPcd} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
