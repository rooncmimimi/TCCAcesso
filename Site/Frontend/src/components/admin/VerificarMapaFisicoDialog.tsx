import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { linhasDoMapa } from "@/lib/mapaFisicoAdmin";
import { extrairMensagemErro } from "@/services/api";
import { verificarAcessibilidadeFisica, type VagaAdmin } from "@/services/admin.service";
import { ambienteService } from "@/services/ambiente.service";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

const SITUACAO = { sim: "comum.sim", parcial: "comum.parcial", nao: "comum.nao" } as const satisfies Record<string, ChaveBase>;

type Props = {
  vaga: VagaAdmin | null;
  aoFechar: () => void;
};

/**
 * Verificação do mapa de acessibilidade física pela moderação. A empresa só DECLARA cada item; o selo
 * "verificado" é da equipe do ACESSO e só deve ser dado depois de conferir de fato (visita, fotos ou
 * documento). Por isso, para marcar é preciso confirmar que a conferência foi feita. Cada ação fica no
 * registro de auditoria e vale só para os itens escolhidos.
 */
export function VerificarMapaFisicoDialog({ vaga, aoFechar }: Props) {
  const { t } = useIdioma();
  const idBase = useId();
  const queryClient = useQueryClient();
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [conferi, setConferi] = useState(false);

  const { data: catalogo, isError } = useQuery({ queryKey: ["vagas", "catalogo-acessibilidade"], queryFn: () => ambienteService.catalogo(), staleTime: 60 * 60 * 1000, enabled: Boolean(vaga) });

  // Cada vaga aberta começa sem nada escolhido e sem a confirmação marcada.
  useEffect(() => {
    setEscolhidos([]);
    setConferi(false);
  }, [vaga?.id]);

  const mudar = useMutation({
    mutationFn: ({ verificado }: { verificado: boolean }) => verificarAcessibilidadeFisica(vaga!.id, escolhidos, verificado),
    onSuccess: ({ alteradas }, { verificado }) => {
      toast.success(alteradas.length === 0 ? "Nada mudou: os itens já estavam nessa situação." : verificado ? `${alteradas.length} item(ns) marcado(s) como verificado(s).` : `${alteradas.length} item(ns) voltaram a “declarado”.`);
      setEscolhidos([]);
      setConferi(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "vagas"] });
      void queryClient.invalidateQueries({ queryKey: ["vaga", vaga?.id] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("admin.verificarMapaFisicoDialog.naoFoiPossivelAtualizarA"))),
  });

  const linhas = catalogo ? linhasDoMapa(vaga?.acessibilidadeFisica, catalogo.itensFisicos) : [];
  const escolhidasLinhas = linhas.filter((l) => escolhidos.includes(l.chave));
  const podeVerificar = escolhidasLinhas.some((l) => l.origem === "declarado") && conferi && !mudar.isPending;
  const podeDesfazer = escolhidasLinhas.some((l) => l.origem === "verificado") && !mudar.isPending;

  const alternar = (chave: string, marcado: boolean) => setEscolhidos((atual) => (marcado ? [...atual, chave] : atual.filter((c) => c !== chave)));

  return (
    <Dialog open={Boolean(vaga)} onOpenChange={(aberto) => (!aberto ? aoFechar() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("admin.verificarMapaFisicoDialog.mapaDeAcessibilidadeFisica")}</DialogTitle>
          <DialogDescription>
            {t("admin.verificarMapaFisicoDialog.vagaAEmpresaDeclarou", { vaga: vaga?.titulo ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("admin.verificarMapaFisicoDialog.naoFoiPossivelCarregarAListaDe")}
          </p>
        ) : !catalogo ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("feed.carregando")}
          </p>
        ) : linhas.length === 0 ? (
          <p role="status" className="text-sm">
            {t("admin.verificarMapaFisicoDialog.aEmpresaNaoInformouNenhumItem")}
          </p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">{t("admin.verificarMapaFisicoDialog.itensInformadosPelaEmpresa")}</legend>
            <ul className="space-y-1">
              {linhas.map((l) => (
                <li key={l.chave} className="flex items-start gap-3 rounded-lg border border-border p-2">
                  <Checkbox id={`${idBase}-${l.chave}`} className="mt-1" checked={escolhidos.includes(l.chave)} onCheckedChange={(v) => alternar(l.chave, v === true)} />
                  <Label htmlFor={`${idBase}-${l.chave}`} className="min-h-11 flex-1 cursor-pointer text-sm font-normal leading-snug">
                    <span className="font-semibold">{l.rotulo}:</span> {SITUACAO[l.situacao] ? t(SITUACAO[l.situacao]) : l.situacao}
                    {l.detalhe ? <span className="block text-muted-foreground">{l.detalhe}</span> : null}
                    {l.origem === "verificado" ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        <BadgeCheck className="size-3.5" aria-hidden="true" /> {t("admin.verificarMapaFisicoDialog.verificado")}
                        {l.verificadoEm ? ` em ${new Date(l.verificadoEm).toLocaleDateString("pt-BR")}` : ""}
                      </span>
                    ) : (
                      <span className="mt-1 block text-xs text-muted-foreground">{t("admin.verificarMapaFisicoDialog.declaradoPelaEmpresaNao")}</span>
                    )}
                  </Label>
                </li>
              ))}
            </ul>

            <div className="flex items-start gap-3 rounded-lg border-2 border-primary p-3">
              <Checkbox id={`${idBase}-conferi`} className="mt-1" checked={conferi} onCheckedChange={(v) => setConferi(v === true)} />
              <Label htmlFor={`${idBase}-conferi`} className="text-sm font-semibold leading-snug">
                {t("admin.verificarMapaFisicoDialog.conferiEstesItensPessoalmente")}
              </Label>
            </div>
          </fieldset>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" className="min-h-11" onClick={aoFechar}>
            {t("ui.dialog.fechar")}
          </Button>
          {linhas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-11" disabled={!podeDesfazer} onClick={() => mudar.mutate({ verificado: false })}>
                {t("admin.verificarMapaFisicoDialog.voltarADeclarado")}
              </Button>
              <Button type="button" className="min-h-11" disabled={!podeVerificar} onClick={() => mudar.mutate({ verificado: true })}>
                {mudar.isPending ? "Salvando…" : t("admin.verificarMapaFisicoDialog.marcarComoVerificado")}
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
