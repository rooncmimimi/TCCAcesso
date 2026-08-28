import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { extrairMensagemErro } from "@/services/api";
import vagasService from "@/services/vagas.service";
import type { PublicoAlvoVaga, RecursoAcessibilidadeVaga } from "@/types";
import {
  CONTRATOS,
  ICONE_RECURSO_ACESSIBILIDADE,
  MODALIDADES,
  PUBLICO_ALVO,
  RECURSOS_ACESSIBILIDADE,
  ROTULO_CONTRATO,
  ROTULO_PUBLICO_ALVO,
  ROTULO_RECURSO_ACESSIBILIDADE,
} from "./constantesVaga";

/**
 * Publicação real de vaga pela empresa autenticada (POST /vagas).
 * Os campos e limites espelham o validador do backend.
 */
export function NovaVagaDialog() {
  const [aberto, setAberto] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<PublicoAlvoVaga>("pcd");
  const [recursosAcessibilidade, setRecursosAcessibilidade] = useState<RecursoAcessibilidadeVaga[]>([]);
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const queryClient = useQueryClient();

  // Cada "Nova vaga" começa em branco, mesmo que o diálogo já tenha sido aberto antes.
  useEffect(() => {
    if (aberto) {
      setCidade("");
      setEstado("");
    }
  }, [aberto]);

  const criar = useMutation({
    mutationFn: (payload: Record<string, unknown>) => vagasService.criar(payload),
    onSuccess: (vaga) => {
      toast.success(`Vaga "${vaga.titulo}" publicada com sucesso.`);
      setAberto(false);
      void queryClient.invalidateQueries({ queryKey: ["minhas-vagas"] });
      void queryClient.invalidateQueries({ queryKey: ["metricas-empresa"] });
      void queryClient.invalidateQueries({ queryKey: ["vagas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível publicar a vaga.")),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const texto = (chave: string) => String(dados.get(chave) ?? "").trim();

    criar.mutate({
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
      // exclusivaPcd é derivado do público-alvo para manter compatibilidade
      // com o campo antigo, sem expor dois controles equivalentes ao usuário.
      exclusivaPcd: publicoAlvo === "pcd" || publicoAlvo === "pcd_cinquenta_mais",
      publicoAlvo,
      recursosAcessibilidade,
    });
  }

  function alternarRecurso(recurso: RecursoAcessibilidadeVaga, marcado: boolean) {
    setRecursosAcessibilidade((atuais) =>
      marcado ? [...atuais, recurso] : atuais.filter((r) => r !== recurso),
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" className="min-h-11 gap-1">
          <Plus className="size-4" aria-hidden="true" /> Nova vaga
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publicar nova vaga</DialogTitle>
          <DialogDescription>
            Descreva a oportunidade e os recursos de acessibilidade disponíveis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da vaga</Label>
            <Input id="titulo" name="titulo" required minLength={5} maxLength={200} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" required minLength={20} rows={5} />
            <p className="text-xs text-muted-foreground">Mínimo de 20 caracteres.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requisitos">Requisitos</Label>
              <Textarea id="requisitos" name="requisitos" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beneficios">Benefícios</Label>
              <Textarea id="beneficios" name="beneficios" rows={3} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade</Label>
              <select
                id="modalidade"
                name="modalidade"
                defaultValue="Presencial"
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
              <Label htmlFor="contrato">Contrato</Label>
              <select
                id="contrato"
                name="contrato"
                defaultValue="CLT"
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
              <Label htmlFor="salario">Salário (R$)</Label>
              <Input id="salario" name="salario" inputMode="decimal" placeholder="2500.00" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <CidadeAutocomplete
                id="cidade"
                name="cidade"
                value={cidade}
                onChange={setCidade}
                estado={estado}
                aria-label="Cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado (UF)</Label>
              <Input
                id="estado"
                name="estado"
                maxLength={2}
                placeholder="SP"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargaHoraria">Carga horária</Label>
              <Input id="cargaHoraria" name="cargaHoraria" placeholder="40h semanais" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publicoAlvo">Público da vaga</Label>
            <select
              id="publicoAlvo"
              value={publicoAlvo}
              onChange={(e) => setPublicoAlvo(e.target.value as PublicoAlvoVaga)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm"
            >
              {PUBLICO_ALVO.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PUBLICO_ALVO[p]}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Recursos de acessibilidade desta vaga</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {RECURSOS_ACESSIBILIDADE.filter((r) => r !== "outro").map((recurso) => {
                const Icone = ICONE_RECURSO_ACESSIBILIDADE[recurso];
                const marcado = recursosAcessibilidade.includes(recurso);
                return (
                  <label
                    key={recurso}
                    className="flex min-h-11 items-center gap-2 rounded-md border border-input px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                  >
                    <Checkbox
                      checked={marcado}
                      onCheckedChange={(c) => alternarRecurso(recurso, Boolean(c))}
                    />
                    <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 truncate">{ROTULO_RECURSO_ACESSIBILIDADE[recurso]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="acessibilidade">Detalhes adicionais de acessibilidade</Label>
            <Textarea
              id="acessibilidade"
              name="acessibilidade"
              rows={3}
              placeholder="Descreva qualquer recurso que não esteja na lista acima"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criar.isPending} className="min-h-11 gap-2">
              {criar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Publicar vaga
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
