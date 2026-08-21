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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extrairMensagemErro } from "@/services/api";
import { empresasService } from "@/services/empresas.service";
import { useSpeech } from "@/contexts/SpeechContext";
import type { Empresa, PorteEmpresa } from "@/types";

const PORTES: PorteEmpresa[] = ["MEI", "Micro", "Pequena", "Media", "Grande"];

/** Edição do perfil empresarial. O backend recusa a chamada se a empresa não estiver aprovada. */
export function EditarEmpresaDialog({ empresa, children }: { empresa: Empresa; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [porte, setPorte] = useState<string>(empresa.porte ?? "");
  const { speak } = useSpeech();
  const queryClient = useQueryClient();

  const salvar = useMutation({
    mutationFn: (payload: Record<string, unknown>) => empresasService.atualizar(empresa.id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["minha-empresa"] });
      toast.success("Perfil da empresa atualizado.");
      speak("Perfil da empresa atualizado.");
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, "Não foi possível atualizar o perfil da empresa.")),
  });

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const texto = (chave: string) => String(dados.get(chave) ?? "").trim();

    salvar.mutate({
      razaoSocial: texto("razaoSocial"),
      nomeFantasia: texto("nomeFantasia") || null,
      descricao: texto("descricao") || null,
      culturaInclusiva: texto("culturaInclusiva") || null,
      setor: texto("setor") || null,
      porte: porte || null,
      site: texto("site") || null,
      cidade: texto("cidade") || null,
      estado: texto("estado").toUpperCase() || null,
      endereco: texto("endereco") || null,
      cep: texto("cep") || null,
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar perfil da empresa</DialogTitle>
          <DialogDescription>Essas informações aparecem no perfil público da sua empresa.</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão social</Label>
              <Input
                id="razaoSocial"
                name="razaoSocial"
                required
                minLength={3}
                maxLength={200}
                defaultValue={empresa.razaoSocial}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome fantasia</Label>
              <Input id="nomeFantasia" name="nomeFantasia" maxLength={200} defaultValue={empresa.nomeFantasia ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" name="descricao" rows={4} maxLength={4000} defaultValue={empresa.descricao ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="culturaInclusiva">Cultura de inclusão</Label>
            <Textarea
              id="culturaInclusiva"
              name="culturaInclusiva"
              rows={3}
              maxLength={4000}
              placeholder="Como a empresa apoia profissionais PCD e pessoas 50+"
              defaultValue={empresa.culturaInclusiva ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Input id="setor" name="setor" maxLength={120} defaultValue={empresa.setor ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="porte">Porte</Label>
              <Select value={porte} onValueChange={setPorte}>
                <SelectTrigger id="porte">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PORTES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site">Site</Label>
            <Input id="site" name="site" type="url" defaultValue={empresa.site ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" name="cidade" maxLength={100} defaultValue={empresa.cidade ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado (UF)</Label>
              <Input id="estado" name="estado" maxLength={2} placeholder="SP" defaultValue={empresa.estado ?? ""} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" defaultValue={empresa.endereco ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" name="cep" maxLength={8} placeholder="00000000" defaultValue={empresa.cep ?? ""} />
            </div>
          </div>

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
