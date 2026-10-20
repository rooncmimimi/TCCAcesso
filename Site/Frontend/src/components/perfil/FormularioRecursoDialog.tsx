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
import { perfilService, type RecursoPerfil } from "@/services/perfil.service";
import { useT } from "@/i18n";

/** União "achatada" dos 4 formatos de recurso: cada campo pode não existir no registro atual. */
type Registro = {
  id?: string;
  cargo?: string;
  empresa?: string;
  local?: string | null;
  modalidade?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  atual?: boolean;
  descricao?: string | null;
  instituicao?: string | null;
  curso?: string;
  nivel?: string | null;
  emAndamento?: boolean;
  titulo?: string;
  emitidoEm?: string | null;
  expiraEm?: string | null;
  credencialUrl?: string | null;
  nome?: string;
};

/** Formulário de criação/edição para os 4 tipos de recurso do perfil (experiência, formação, certificado, habilidade). */
export function FormularioRecursoDialog({
  recurso,
  registro,
  children,
}: {
  recurso: RecursoPerfil;
  registro?: Registro;
  children: ReactNode;
}) {
  const t = useT();
  const tf = t.perfilItens.formulario;
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState(Boolean(registro?.atual));
  const [emAndamento, setEmAndamento] = useState(Boolean(registro?.emAndamento));
  const queryClient = useQueryClient();
  const editando = Boolean(registro?.id);

  function alternarAberto(next: boolean) {
    if (next) {
      // Reseta os toggles a cada abertura: evita "vazar" o estado de um uso anterior do diálogo.
      setAtual(Boolean(registro?.atual));
      setEmAndamento(Boolean(registro?.emAndamento));
    }
    setAberto(next);
  }

  const salvar = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editando
        ? perfilService.atualizarRecurso(recurso, registro!.id!, payload)
        : perfilService.criarRecurso(recurso, payload),
    onSuccess: () => {
      toast.success(editando ? tf.atualizado : tf.adicionado);
      void queryClient.invalidateQueries({ queryKey: ["perfil-recurso", recurso] });
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tf.erroSalvar)),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const texto = (chave: string) => String(dados.get(chave) ?? "").trim() || null;

    if (recurso === "experiencias") {
      salvar.mutate({
        cargo: texto("cargo"),
        empresa: texto("empresa"),
        local: texto("local"),
        modalidade: texto("modalidade"),
        dataInicio: texto("dataInicio"),
        dataFim: atual ? null : texto("dataFim"),
        atual,
        descricao: texto("descricao"),
      });
    } else if (recurso === "formacoes") {
      salvar.mutate({
        instituicao: texto("instituicao"),
        curso: texto("curso"),
        nivel: texto("nivel"),
        dataInicio: texto("dataInicio"),
        dataFim: emAndamento ? null : texto("dataFim"),
        emAndamento,
        descricao: texto("descricao"),
      });
    } else if (recurso === "certificados") {
      salvar.mutate({
        titulo: texto("titulo"),
        instituicao: texto("instituicao"),
        emitidoEm: texto("emitidoEm"),
        expiraEm: texto("expiraEm"),
        credencialUrl: texto("credencialUrl"),
      });
    } else {
      salvar.mutate({
        nome: texto("nome"),
        nivel: texto("nivel"),
      });
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={alternarAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editando ? tf.editar(tf.titulos[recurso]) : tf.adicionar(tf.titulos[recurso])}
          </DialogTitle>
          <DialogDescription>
            {tf.descAntes} <span aria-hidden="true">*</span>
            <span className="sr-only">{tf.asteriscoSr}</span> {tf.descDepois}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          {recurso === "experiencias" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cargo">{tf.cargo} <span aria-hidden="true">*</span></Label>
                  <Input id="cargo" name="cargo" required minLength={2} maxLength={150} defaultValue={registro?.cargo ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa">{tf.empresa} <span aria-hidden="true">*</span></Label>
                  <Input id="empresa" name="empresa" required minLength={2} maxLength={150} defaultValue={registro?.empresa ?? ""} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="local">{tf.local}</Label>
                  <Input id="local" name="local" maxLength={150} defaultValue={registro?.local ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modalidade">{tf.modalidade}</Label>
                  <Input id="modalidade" name="modalidade" maxLength={50} placeholder={tf.modalidadeExemplo} defaultValue={registro?.modalidade ?? ""} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">{tf.inicio} <span aria-hidden="true">*</span></Label>
                  <Input id="dataInicio" name="dataInicio" type="date" required defaultValue={registro?.dataInicio?.slice(0, 10) ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">{tf.fim}</Label>
                  <Input id="dataFim" name="dataFim" type="date" disabled={atual} defaultValue={registro?.dataFim?.slice(0, 10) ?? ""} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="atual" className="cursor-pointer">{tf.trabalhoAtual}</Label>
                <Switch id="atual" checked={atual} onCheckedChange={setAtual} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">{tf.descricao}</Label>
                <Textarea id="descricao" name="descricao" rows={3} maxLength={2000} defaultValue={registro?.descricao ?? ""} />
              </div>
            </>
          )}

          {recurso === "formacoes" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instituicao">{tf.instituicao} <span aria-hidden="true">*</span></Label>
                  <Input id="instituicao" name="instituicao" required minLength={2} maxLength={180} defaultValue={registro?.instituicao ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curso">{tf.curso} <span aria-hidden="true">*</span></Label>
                  <Input id="curso" name="curso" required minLength={2} maxLength={180} defaultValue={registro?.curso ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">{tf.nivel}</Label>
                <Input id="nivel" name="nivel" maxLength={80} placeholder={tf.nivelFormacaoExemplo} defaultValue={registro?.nivel ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">{tf.inicio}</Label>
                  <Input id="dataInicio" name="dataInicio" type="date" defaultValue={registro?.dataInicio?.slice(0, 10) ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">{tf.conclusao}</Label>
                  <Input id="dataFim" name="dataFim" type="date" disabled={emAndamento} defaultValue={registro?.dataFim?.slice(0, 10) ?? ""} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="emAndamento" className="cursor-pointer">{tf.emAndamento}</Label>
                <Switch id="emAndamento" checked={emAndamento} onCheckedChange={setEmAndamento} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">{tf.descricao}</Label>
                <Textarea id="descricao" name="descricao" rows={3} maxLength={2000} defaultValue={registro?.descricao ?? ""} />
              </div>
            </>
          )}

          {recurso === "certificados" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="titulo">{tf.titulo} <span aria-hidden="true">*</span></Label>
                <Input id="titulo" name="titulo" required minLength={2} maxLength={180} defaultValue={registro?.titulo ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instituicao">{tf.instituicaoEmissora}</Label>
                <Input id="instituicao" name="instituicao" maxLength={180} defaultValue={registro?.instituicao ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emitidoEm">{tf.emitidoEm}</Label>
                  <Input id="emitidoEm" name="emitidoEm" type="date" defaultValue={registro?.emitidoEm?.slice(0, 10) ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiraEm">{tf.expiraEm}</Label>
                  <Input id="expiraEm" name="expiraEm" type="date" defaultValue={registro?.expiraEm?.slice(0, 10) ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credencialUrl">{tf.linkCredencial}</Label>
                <Input id="credencialUrl" name="credencialUrl" type="url" maxLength={500} defaultValue={registro?.credencialUrl ?? ""} />
              </div>
            </>
          )}

          {recurso === "habilidades" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome">{tf.habilidade} <span aria-hidden="true">*</span></Label>
                <Input id="nome" name="nome" required minLength={2} maxLength={80} defaultValue={registro?.nome ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">{tf.nivel}</Label>
                <Input id="nivel" name="nivel" maxLength={80} placeholder={tf.nivelHabilidadeExemplo} defaultValue={registro?.nivel ?? ""} />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              {t.comum.cancelar}
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.comum.salvar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
