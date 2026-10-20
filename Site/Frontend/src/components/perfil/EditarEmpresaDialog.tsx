import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Trash2 } from "lucide-react";
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
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { extrairMensagemErro } from "@/services/api";
import { empresasService } from "@/services/empresas.service";
import { CapaUploader } from "./CapaUploader";
import { FotoUploader } from "./FotoUploader";
import { DicaDimensaoImagem } from "./DicaDimensaoImagem";
import { PORTES_EMPRESA } from "@/utils/formatacao";
import type { Empresa } from "@/types";
import { useT } from "@/i18n";

/** Edição do perfil empresarial. O backend recusa a chamada se a empresa não estiver aprovada. */
export function EditarEmpresaDialog({ empresa, children }: { empresa: Empresa; children: ReactNode }) {
  const t = useT();
  const te = t.perfilEdicao;
  const tm = te.empresa;
  const [aberto, setAberto] = useState(false);
  const [porte, setPorte] = useState<string>(empresa.porte ?? "");
  const [cidade, setCidade] = useState(empresa.cidade ?? "");
  const [estado, setEstado] = useState(empresa.estado ?? "");
  const queryClient = useQueryClient();

  // Reabrir o diálogo sempre reflete os dados mais recentes da empresa.
  useEffect(() => {
    if (aberto) {
      setCidade(empresa.cidade ?? "");
      setEstado(empresa.estado ?? "");
    }
  }, [aberto, empresa.cidade, empresa.estado]);

  const invalidarEmpresa = () => queryClient.invalidateQueries({ queryKey: ["minha-empresa"] });

  // Os toasts abaixo já são lidos pelo `useLeituraAutomatica`; falar aqui também duplicaria a
  // leitura.
  const salvar = useMutation({
    mutationFn: (payload: Record<string, unknown>) => empresasService.atualizar(empresa.id, payload),
    onSuccess: () => {
      void invalidarEmpresa();
      toast.success(tm.atualizado);
      setAberto(false);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, tm.erro)),
  });

  const removerBanner = useMutation({
    mutationFn: () => empresasService.atualizar(empresa.id, { capa: null }),
    onSuccess: () => {
      void invalidarEmpresa();
      toast.success(te.bannerRemovido);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, te.erroRemoverBanner)),
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
          <DialogTitle>{tm.titulo}</DialogTitle>
          <DialogDescription>{tm.descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-sm font-medium">{te.banner}</p>
            <div className="overflow-hidden rounded-lg border">
              <CapaUploader
                capaUrl={empresa.capa}
                onEnviar={async (arquivo) => {
                  await empresasService.atualizarCapa(empresa.id, arquivo);
                  await invalidarEmpresa();
                }}
              />
            </div>
            <DicaDimensaoImagem tipo="banner" />
            {empresa.capa ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 gap-1 text-destructive hover:text-destructive"
                disabled={removerBanner.isPending}
                onClick={() => removerBanner.mutate()}
              >
                <Trash2 className="size-4" aria-hidden="true" /> {te.removerBanner}
              </Button>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{tm.logo}</p>
            <FotoUploader
              nome={empresa.nomeFantasia || empresa.razaoSocial}
              fotoUrl={empresa.logo}
              fallback={<Building2 className="size-8" aria-hidden="true" />}
              rotulo={tm.alterarLogo}
              onEnviar={async (arquivo) => {
                await empresasService.atualizarLogo(empresa.id, arquivo);
                await invalidarEmpresa();
              }}
            />
            <DicaDimensaoImagem tipo="foto" />
          </div>
        </div>

        <form onSubmit={enviar} className="space-y-4 border-t pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">{tm.razaoSocial}</Label>
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
              <Label htmlFor="nomeFantasia">{tm.nomeFantasia}</Label>
              <Input id="nomeFantasia" name="nomeFantasia" maxLength={200} defaultValue={empresa.nomeFantasia ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">{tm.descricaoCampo}</Label>
            <Textarea id="descricao" name="descricao" rows={4} maxLength={4000} defaultValue={empresa.descricao ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="culturaInclusiva">{tm.cultura}</Label>
            <Textarea
              id="culturaInclusiva"
              name="culturaInclusiva"
              rows={3}
              maxLength={4000}
              placeholder={tm.culturaExemplo}
              defaultValue={empresa.culturaInclusiva ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setor">{tm.setor}</Label>
              <Input id="setor" name="setor" maxLength={120} defaultValue={empresa.setor ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="porte">{tm.porte}</Label>
              <Select value={porte} onValueChange={setPorte}>
                <SelectTrigger id="porte">
                  <SelectValue placeholder={tm.porteEscolha} />
                </SelectTrigger>
                <SelectContent>
                  {PORTES_EMPRESA.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {t.comum.portes[p.valor]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site">{tm.site}</Label>
            <Input id="site" name="site" type="url" defaultValue={empresa.site ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cidade">{tm.cidade}</Label>
              <CidadeAutocomplete
                id="cidade"
                name="cidade"
                value={cidade}
                onChange={setCidade}
                estado={estado}
                aria-label={te.cidadeAria}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">{te.estadoUf}</Label>
              <Input
                id="estado"
                name="estado"
                maxLength={2}
                placeholder="SP"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="endereco">{tm.endereco}</Label>
              <Input id="endereco" name="endereco" defaultValue={empresa.endereco ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">{tm.cep}</Label>
              <Input id="cep" name="cep" maxLength={8} placeholder="00000000" defaultValue={empresa.cep ?? ""} />
            </div>
          </div>

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
