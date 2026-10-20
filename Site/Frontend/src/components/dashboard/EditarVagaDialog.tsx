import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { extrairMensagemErro } from "@/services/api";
import vagasService from "@/services/vagas.service";
import { useT } from "@/i18n";
import {
  CONTRATOS,
  ICONE_RECURSO_ACESSIBILIDADE,
  MODALIDADES,
  PUBLICO_ALVO,
  RECURSOS_ACESSIBILIDADE,
} from "./constantesVaga";
import type { PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga } from "@/types";

/**
 * Edição de uma vaga já publicada (PUT /vagas/:id). Mesmos campos e limites
 * do formulário de criação: o backend já valida posse e aprovação da
 * empresa (`garantirDono` + `garantirEmpresaAprovada`).
 */
export function EditarVagaDialog({ vaga, children }: { vaga: Vaga; children: ReactNode }) {
  const t = useT();
  const tf = t.dashboard.formulario;
  const [aberto, setAberto] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<PublicoAlvoVaga>(vaga.publicoAlvo ?? "pcd");
  const [recursosAcessibilidade, setRecursosAcessibilidade] = useState<RecursoAcessibilidadeVaga[]>(
    vaga.recursosAcessibilidade ?? [],
  );
  const [cidade, setCidade] = useState(vaga.cidade ?? "");
  const [estado, setEstado] = useState(vaga.estado ?? "");
  const queryClient = useQueryClient();

  // Reabrir o diálogo sempre reflete os dados mais recentes da vaga.
  useEffect(() => {
    if (aberto) {
      setCidade(vaga.cidade ?? "");
      setEstado(vaga.estado ?? "");
    }
  }, [aberto, vaga.cidade, vaga.estado]);

  function alternarRecurso(recurso: RecursoAcessibilidadeVaga, marcado: boolean) {
    setRecursosAcessibilidade((atuais) =>
      marcado ? [...atuais, recurso] : atuais.filter((r) => r !== recurso),
    );
  }
  const salvar = useMutation({
    mutationFn: (payload: Record<string, unknown>) => vagasService.atualizar(vaga.id, payload),
    onSuccess: () => {
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(tf.atualizada);
      setAberto(false);
      void queryClient.invalidateQueries({ queryKey: ["minhas-vagas"] });
      void queryClient.invalidateQueries({ queryKey: ["vaga", vaga.id] });
      void queryClient.invalidateQueries({ queryKey: ["vagas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tf.erroAtualizar)),
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
      publicoAlvo,
      recursosAcessibilidade,
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tf.editarTitulo}</DialogTitle>
          <DialogDescription>{tf.editarDescricao}</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`titulo-${vaga.id}`}>{tf.titulo}</Label>
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
            <Label htmlFor={`descricao-${vaga.id}`}>{tf.descricao}</Label>
            <Textarea
              id={`descricao-${vaga.id}`}
              name="descricao"
              required
              minLength={20}
              rows={5}
              defaultValue={vaga.descricao}
            />
            <p className="text-xs text-muted-foreground">{tf.minimo20}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`requisitos-${vaga.id}`}>{tf.requisitos}</Label>
              <Textarea id={`requisitos-${vaga.id}`} name="requisitos" rows={3} defaultValue={vaga.requisitos ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`beneficios-${vaga.id}`}>{tf.beneficios}</Label>
              <Textarea id={`beneficios-${vaga.id}`} name="beneficios" rows={3} defaultValue={vaga.beneficios ?? ""} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`modalidade-${vaga.id}`}>{tf.modalidade}</Label>
              <select
                id={`modalidade-${vaga.id}`}
                name="modalidade"
                defaultValue={vaga.modalidade}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {MODALIDADES.map((m) => (
                  <option key={m} value={m}>
                    {t.vagas.modalidade[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`contrato-${vaga.id}`}>{tf.contrato}</Label>
              <select
                id={`contrato-${vaga.id}`}
                name="contrato"
                defaultValue={vaga.contrato ?? "clt"}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CONTRATOS.map((c) => (
                  <option key={c} value={c}>
                    {t.vagas.contrato[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`salario-${vaga.id}`}>{tf.salario}</Label>
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
              <Label htmlFor={`cidade-${vaga.id}`}>{tf.cidade}</Label>
              <CidadeAutocomplete
                id={`cidade-${vaga.id}`}
                name="cidade"
                value={cidade}
                onChange={setCidade}
                estado={estado}
                aria-label={tf.cidade}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`estado-${vaga.id}`}>{tf.estado}</Label>
              <Input
                id={`estado-${vaga.id}`}
                name="estado"
                maxLength={2}
                placeholder="SP"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cargaHoraria-${vaga.id}`}>{tf.cargaHoraria}</Label>
              <Input
                id={`cargaHoraria-${vaga.id}`}
                name="cargaHoraria"
                placeholder={tf.cargaHorariaExemplo}
                defaultValue={vaga.cargaHoraria ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`publicoAlvo-${vaga.id}`}>{tf.publicoAlvo}</Label>
            <select
              id={`publicoAlvo-${vaga.id}`}
              value={publicoAlvo}
              onChange={(e) => setPublicoAlvo(e.target.value as PublicoAlvoVaga)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm"
            >
              {PUBLICO_ALVO.map((p) => (
                <option key={p} value={p}>
                  {t.vagas.publicoAlvo[p]}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{tf.recursos}</legend>
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
                    <span className="min-w-0 truncate">{t.vagas.recursos[recurso]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor={`acessibilidade-${vaga.id}`}>{tf.detalhes}</Label>
            <Textarea
              id={`acessibilidade-${vaga.id}`}
              name="acessibilidade"
              rows={3}
              placeholder={tf.detalhesExemplo}
              defaultValue={vaga.acessibilidade ?? ""}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              {t.comum.cancelar}
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {tf.salvarAlteracoes}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
