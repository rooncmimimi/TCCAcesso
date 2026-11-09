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
import { useIdioma } from "@/hooks/useIdioma";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DitadoParaCampo } from "@/components/acessibilidade/DitadoParaCampo";
import { Switch } from "@/components/ui/switch";
import { extrairMensagemErro } from "@/services/api";
import { perfilService, type RecursoPerfil } from "@/services/perfil.service";
import { DicaDeCampoBotao } from "@/components/acessibilidade/DicaDeCampoBotao";
import { AvisoDeRascunho } from "@/components/acessibilidade/AvisoDeRascunho";
import { useRascunhoDeFormulario } from "@/hooks/useRascunhoDeFormulario";

/** Os únicos campos de texto livre que entram no rascunho automático. */
const CAMPOS_DO_RASCUNHO = ["cargo", "empresa", "local", "descricao", "instituicao", "curso", "titulo", "nome"] as const;

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

const TITULOS: Record<RecursoPerfil, string> = {
  experiencias: "experiência",
  formacoes: "formação",
  certificados: "certificado",
  habilidades: "habilidade",
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
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState(Boolean(registro?.atual));
  const [emAndamento, setEmAndamento] = useState(Boolean(registro?.emAndamento));
  const queryClient = useQueryClient();
  const editando = Boolean(registro?.id);
  // Rascunho só do texto livre (cargo, empresa, curso, descrição): sem datas nem nada pessoal.
  const rascunho = useRascunhoDeFormulario({
    chave: `recurso:${recurso}:${registro?.id ?? "novo"}`,
    campos: CAMPOS_DO_RASCUNHO,
    ativo: aberto,
  });

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
      toast.success(editando ? "Registro atualizado." : "Registro adicionado.");
      void queryClient.invalidateQueries({ queryKey: ["perfil-recurso", recurso] });
      rascunho.limpar();
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível salvar.")),
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
            {editando ? `Editar ${TITULOS[recurso]}` : `Adicionar ${TITULOS[recurso]}`}
          </DialogTitle>
          <DialogDescription>
            Essas informações aparecem no seu perfil público. Campos com <span aria-hidden="true">*</span>
            <span className="sr-only">asterisco</span> são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <form ref={rascunho.ref} onSubmit={enviar} className="space-y-4">
          <AvisoDeRascunho rascunho={rascunho.rascunho} aoRestaurar={rascunho.restaurar} aoDescartar={rascunho.descartar} />
          {recurso === "experiencias" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cargo">{t("perfil.formularioRecursoDialog.cargo")} <span aria-hidden="true">*</span></Label>
                  <Input id="cargo" name="cargo" required minLength={2} maxLength={150} defaultValue={registro?.cargo ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="empresa">{t("vaga.empresa")} <span aria-hidden="true">*</span></Label>
                  <Input id="empresa" name="empresa" required minLength={2} maxLength={150} defaultValue={registro?.empresa ?? ""} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="local">{t("perfil.formularioRecursoDialog.local")}</Label>
                  <Input id="local" name="local" maxLength={150} defaultValue={registro?.local ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modalidade">{t("filtro.modalidade")}</Label>
                  <Input id="modalidade" name="modalidade" maxLength={50} placeholder={t("perfil.formularioRecursoDialog.presencialRemoto")} defaultValue={registro?.modalidade ?? ""} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">{t("cabecalho.inicio")} <span aria-hidden="true">*</span></Label>
                  <Input id="dataInicio" name="dataInicio" type="date" required defaultValue={registro?.dataInicio?.slice(0, 10) ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">Fim</Label>
                  <Input id="dataFim" name="dataFim" type="date" disabled={atual} defaultValue={registro?.dataFim?.slice(0, 10) ?? ""} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="atual" className="cursor-pointer">{t("perfil.formularioRecursoDialog.trabalhoAtualmenteAqui")}</Label>
                <Switch id="atual" checked={atual} onCheckedChange={setAtual} />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <Label htmlFor="descricao">{t("vagaDetalhe.descricao")}</Label>
                  <DicaDeCampoBotao dica="experienciaDescricao" nomeDoCampo={t("vagaDetalhe.descricao")} />
                </div>
                <Textarea id="descricao" name="descricao" rows={3} maxLength={2000} defaultValue={registro?.descricao ?? ""} />
                <DitadoParaCampo campoId="descricao" />
              </div>
            </>
          )}

          {recurso === "formacoes" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instituicao">{t("perfil.formularioRecursoDialog.instituicao")} <span aria-hidden="true">*</span></Label>
                  <Input id="instituicao" name="instituicao" required minLength={2} maxLength={180} defaultValue={registro?.instituicao ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curso">{t("perfil.formularioRecursoDialog.curso")} <span aria-hidden="true">*</span></Label>
                  <Input id="curso" name="curso" required minLength={2} maxLength={180} defaultValue={registro?.curso ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">{t("perfil.formularioRecursoDialog.nivel")}</Label>
                <Input id="nivel" name="nivel" maxLength={80} placeholder={t("perfil.formularioRecursoDialog.tecnicoGraduacaoPos")} defaultValue={registro?.nivel ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">{t("cabecalho.inicio")}</Label>
                  <Input id="dataInicio" name="dataInicio" type="date" defaultValue={registro?.dataInicio?.slice(0, 10) ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataFim">{t("perfil.formularioRecursoDialog.conclusao")}</Label>
                  <Input id="dataFim" name="dataFim" type="date" disabled={emAndamento} defaultValue={registro?.dataFim?.slice(0, 10) ?? ""} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="emAndamento" className="cursor-pointer">{t("perfil.formularioRecursoDialog.emAndamento")}</Label>
                <Switch id="emAndamento" checked={emAndamento} onCheckedChange={setEmAndamento} />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <Label htmlFor="descricao">{t("vagaDetalhe.descricao")}</Label>
                  <DicaDeCampoBotao dica="formacaoDescricao" nomeDoCampo={t("vagaDetalhe.descricao")} />
                </div>
                <Textarea id="descricao" name="descricao" rows={3} maxLength={2000} defaultValue={registro?.descricao ?? ""} />
                <DitadoParaCampo campoId="descricao" />
              </div>
            </>
          )}

          {recurso === "certificados" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="titulo">{t("perfil.formularioRecursoDialog.titulo")} <span aria-hidden="true">*</span></Label>
                <Input id="titulo" name="titulo" required minLength={2} maxLength={180} defaultValue={registro?.titulo ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instituicao">{t("perfil.formularioRecursoDialog.instituicaoEmissora")}</Label>
                <Input id="instituicao" name="instituicao" maxLength={180} defaultValue={registro?.instituicao ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emitidoEm">{t("perfil.formularioRecursoDialog.emitidoEm")}</Label>
                  <Input id="emitidoEm" name="emitidoEm" type="date" defaultValue={registro?.emitidoEm?.slice(0, 10) ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiraEm">{t("perfil.formularioRecursoDialog.expiraEm")}</Label>
                  <Input id="expiraEm" name="expiraEm" type="date" defaultValue={registro?.expiraEm?.slice(0, 10) ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credencialUrl">{t("perfil.formularioRecursoDialog.linkDaCredencial")}</Label>
                <Input id="credencialUrl" name="credencialUrl" type="url" maxLength={500} defaultValue={registro?.credencialUrl ?? ""} />
              </div>
            </>
          )}

          {recurso === "habilidades" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nome">{t("perfil.formularioRecursoDialog.habilidade")} <span aria-hidden="true">*</span></Label>
                <Input id="nome" name="nome" required minLength={2} maxLength={80} defaultValue={registro?.nome ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">{t("perfil.formularioRecursoDialog.nivel")}</Label>
                <Input id="nivel" name="nivel" maxLength={80} placeholder={t("perfil.formularioRecursoDialog.basicoIntermediarioAvancado")} defaultValue={registro?.nivel ?? ""} />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
