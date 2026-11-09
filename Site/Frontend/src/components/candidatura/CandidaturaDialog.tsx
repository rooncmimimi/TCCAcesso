import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EscolhaDeAdaptacoes } from "@/components/candidatura/EscolhaDeAdaptacoes";
import { PreviaDePrivacidade } from "@/components/candidatura/PreviaDePrivacidade";
import { CampoComDitado } from "@/components/acessibilidade/CampoComDitado";
import { EntrevistaOferecida } from "@/components/candidatura/EntrevistaOferecida";
import { candidaturaAdaptacoesService, minhaAcessibilidadeService } from "@/services/adaptacoes.service";
import vagasService from "@/services/vagas.service";
import { extrairMensagemErro } from "@/services/api";
import { completarEscolha, escolhaTemConteudo, escolhaVazia, type EscolhaDeCompartilhamento, type EtapaDoRascunho } from "@/types/adaptacoes";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

const ETAPAS: { chave: EtapaDoRascunho; titulo: ChaveBase }[] = [
  { chave: "mensagem", titulo: "candidatura.candidaturaDialog.mensagem" },
  { chave: "adaptacoes", titulo: "candidatura.candidaturaDialog.adaptacoes" },
  { chave: "revisao", titulo: "candidatura.candidaturaDialog.revisarEEnviar" },
];

/** Espera depois da última alteração antes de guardar o rascunho no servidor. */
export const ESPERA_DO_RASCUNHO_NO_SERVIDOR_MS = 1500;

type Props = {
  vaga: { id: string; titulo: string };
  aberto: boolean;
  aoFechar: () => void;
  /** Chamado depois que a candidatura foi enviada de verdade. */
  aoEnviar?: () => void;
};

/**
 * Candidatura em três etapas: mensagem, adaptações e revisão. O que a pessoa preenche é guardado
 * como RASCUNHO no servidor (retoma de onde parou, em qualquer aparelho), e nada de acessibilidade
 * é compartilhado enquanto ela só preenche. A prévia de privacidade e a autorização acontecem na
 * última etapa; só o envio definitivo cria a candidatura, avisa a empresa e apaga o rascunho.
 */
export function CandidaturaDialog({ vaga, aberto, aoFechar, aoEnviar }: Props) {
  const { t } = useIdioma();
  const queryClient = useQueryClient();
  const [etapa, setEtapa] = useState<EtapaDoRascunho>("mensagem");
  const [mensagem, setMensagem] = useState("");
  const [escolha, setEscolha] = useState<EscolhaDeCompartilhamento>(escolhaVazia());
  const [aceita, setAceita] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const [sujo, setSujo] = useState(false);
  const tituloRef = useRef<HTMLParagraphElement>(null);

  const catalogo = useQuery({ queryKey: ["minha-acessibilidade", "catalogo"], queryFn: () => minhaAcessibilidadeService.catalogo(), enabled: aberto, staleTime: 60 * 60 * 1000 });
  const perfil = useQuery({ queryKey: ["minha-acessibilidade"], queryFn: () => minhaAcessibilidadeService.obter(), enabled: aberto });
  const rascunho = useQuery({ queryKey: ["candidaturas", "rascunho", vaga.id], queryFn: () => candidaturaAdaptacoesService.obterRascunho(vaga.id), enabled: aberto });

  // O que a vaga já oferece na entrevista (informação da empresa). Mesma chave da página da vaga, então
  // normalmente já está em cache; se falhar, a etapa segue sem a caixa e nada se perde.
  const dadosDaVaga = useQuery({ queryKey: ["vaga", vaga.id], queryFn: () => vagasService.detalhar(vaga.id), enabled: aberto, staleTime: 60 * 1000 });

  // Ao abrir: recomeça limpo, e depois traz o rascunho salvo (uma vez).
  useEffect(() => {
    if (!aberto) {
      setRestaurado(false);
      setSujo(false);
      setAceita(false);
      return;
    }
    if (restaurado || rascunho.isLoading) return;

    if (rascunho.data) {
      setMensagem(rascunho.data.mensagem ?? "");
      setEscolha(completarEscolha(rascunho.data.selecao));
      setEtapa(rascunho.data.etapa);
    } else {
      setMensagem("");
      setEscolha(escolhaVazia());
      setEtapa("mensagem");
    }
    setRestaurado(true);
  }, [aberto, rascunho.isLoading, rascunho.data, restaurado]);

  const salvar = useMutation({
    mutationFn: () => candidaturaAdaptacoesService.salvarRascunho(vaga.id, { mensagem, etapa, selecao: escolha }),
    onSuccess: () => {
      setSujo(false);
      void queryClient.invalidateQueries({ queryKey: ["candidaturas", "rascunho"] });
      void queryClient.invalidateQueries({ queryKey: ["candidaturas", "rascunhos"] });
    },
  });

  // Salva sozinho, em silêncio, algum tempo depois da última alteração.
  const salvarRef = useRef(salvar.mutate);
  salvarRef.current = salvar.mutate;
  useEffect(() => {
    if (!aberto || !restaurado || !sujo) return undefined;
    const espera = setTimeout(() => salvarRef.current(), ESPERA_DO_RASCUNHO_NO_SERVIDOR_MS);
    return () => clearTimeout(espera);
  }, [aberto, restaurado, sujo, mensagem, escolha, etapa]);

  const tem = escolhaTemConteudo(escolha);

  const previa = useQuery({
    queryKey: ["candidaturas", "previa", vaga.id, JSON.stringify(escolha)],
    queryFn: () => candidaturaAdaptacoesService.previa(vaga.id, escolha),
    enabled: aberto && restaurado && etapa === "revisao",
  });

  const descartar = useMutation({
    mutationFn: () => candidaturaAdaptacoesService.descartarRascunho(vaga.id),
    onSuccess: () => {
      toast.success(t("candidatura.candidaturaDialog.rascunhoDescartado"));
      void queryClient.invalidateQueries({ queryKey: ["candidaturas", "rascunho"] });
      void queryClient.invalidateQueries({ queryKey: ["candidaturas", "rascunhos"] });
      setSujo(false);
      aoFechar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const enviar = useMutation({
    mutationFn: () => candidaturaAdaptacoesService.enviar(vaga.id, { mensagem, compartilhar: escolha, aceita: tem ? aceita : false }),
    onSuccess: () => {
      toast.success(t("candidatura.candidaturaDialog.candidaturaEnviada"));
      void queryClient.invalidateQueries({ queryKey: ["candidaturas"] });
      void queryClient.invalidateQueries({ queryKey: ["metricas-candidato"] });
      setSujo(false);
      aoEnviar?.();
      aoFechar();
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });

  const indice = ETAPAS.findIndex((e) => e.chave === etapa);

  const irPara = useCallback((proxima: EtapaDoRascunho) => {
    setEtapa(proxima);
    setSujo(true);
    // O foco vai para o título da etapa, para quem usa leitor de tela ouvir onde está.
    setTimeout(() => tituloRef.current?.focus(), 0);
  }, []);

  // Fechar com mudanças ainda não guardadas: guarda antes de sair, para não perder nada.
  function fechar() {
    if (sujo && restaurado) salvar.mutate();
    aoFechar();
  }

  const carregando = !restaurado || catalogo.isLoading || perfil.isLoading;
  const podeEnviar = !enviar.isPending && (!tem || aceita) && (etapa !== "revisao" || Boolean(previa.data));

  return (
    <Dialog open={aberto} onOpenChange={(v) => (!v ? fechar() : undefined)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("candidatura.candidaturaDialog.candidatarSe", { vaga: vaga.titulo })}</DialogTitle>
          <DialogDescription>
            {t("candidatura.candidaturaDialog.vocePodePararAQualquerMomento")}
          </DialogDescription>
        </DialogHeader>

        <p aria-live="polite" className="text-sm font-semibold text-primary">
          Etapa {indice + 1} de {ETAPAS.length} — {t(ETAPAS[indice].titulo)}
        </p>

        {carregando ? (
          <div role="status" className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t("feed.carregando")}
          </div>
        ) : catalogo.isError || perfil.isError || !catalogo.data || !perfil.data ? (
          <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
            <p>{t("candidatura.candidaturaDialog.naoFoiPossivelCarregarAsOpcoes")}</p>
            <Button variant="outline" size="sm" onClick={() => { void catalogo.refetch(); void perfil.refetch(); }}>
              {t("raiz.tentarNovamente")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p ref={tituloRef} tabIndex={-1} className="text-base font-bold outline-none">
              {t(ETAPAS[indice].titulo)}
            </p>

            {rascunho.data && etapa !== "revisao" && !sujo ? (
              <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">
                {t("candidatura.candidaturaDialog.continuamosDeOndeVoceParouSeu")}
              </p>
            ) : null}

            {etapa === "mensagem" ? (
              <div className="space-y-2">
                <Label htmlFor="candidatura-mensagem">{t("candidatura.candidaturaDialog.mensagemParaAEmpresaOpcional")}</Label>
                <CampoComDitado
                  id="candidatura-mensagem"
                  valor={mensagem}
                  aoMudar={(v) => {
                    setMensagem(v);
                    setSujo(true);
                  }}
                  rows={5}
                  maxLength={2000}
                  ajuda={t("candidatura.candidaturaDialog.contePorQueSeInteressouPela")}
                />
              </div>
            ) : null}

            {etapa === "adaptacoes" ? (
              <>
                <EntrevistaOferecida adaptacoes={dadosDaVaga.data?.entrevistaAdaptacoes} observacao={dadosDaVaga.data?.entrevistaObservacao} />
                <EscolhaDeAdaptacoes
                  catalogo={catalogo.data}
                  perfil={perfil.data}
                  escolha={escolha}
                  aoMudar={(proxima) => {
                    setEscolha(proxima);
                    setAceita(false);
                    setSujo(true);
                  }}
                />
              </>
            ) : null}

            {etapa === "revisao" ? (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">{t("candidatura.candidaturaDialog.oQueAEmpresaRecebera")}</h3>
                {previa.isLoading ? (
                  <div role="status" className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" /> {t("candidatura.candidaturaDialog.montandoAPrevia")}
                  </div>
                ) : previa.isError || !previa.data ? (
                  <div role="alert" className="space-y-2 text-sm text-destructive">
                    <p>{t("candidatura.candidaturaDialog.naoFoiPossivelMontarAPreviaSem")}</p>
                    <Button variant="outline" size="sm" onClick={() => previa.refetch()}>
                      {t("raiz.tentarNovamente")}
                    </Button>
                  </div>
                ) : (
                  <PreviaDePrivacidade previa={previa.data} />
                )}

                {mensagem ? (
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold">{t("candidatura.candidaturaDialog.suaMensagem")}</h3>
                    <p className="whitespace-pre-line rounded-lg border bg-muted/30 p-3 text-sm">{mensagem}</p>
                  </div>
                ) : null}

                {tem ? (
                  <div className="flex items-start gap-3 rounded-lg border-2 border-primary p-3">
                    <Checkbox id="candidatura-autorizo" className="mt-1" checked={aceita} onCheckedChange={(v) => setAceita(v === true)} />
                    <Label htmlFor="candidatura-autorizo" className="text-sm font-semibold leading-snug">
                      Autorizo compartilhar com esta empresa, apenas nesta candidatura e para o processo seletivo, as adaptações listadas acima. Posso retirar a autorização depois; a
                      empresa não poderá mais consultá-las, mas o que já tiver lido não pode ser desfeito.
                    </Label>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("candidatura.candidaturaDialog.voceNaoMarcouNenhumaInformacao")}</p>
                )}
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => salvar.mutate(undefined, { onSuccess: () => { toast.success(t("candidatura.candidaturaDialog.rascunhoSalvoVocePodeContinuar")); aoFechar(); } })} disabled={carregando || salvar.isPending}>
              <Save className="size-4" aria-hidden="true" /> {t("candidatura.candidaturaDialog.salvarEContinuarDepois")}
            </Button>
            {rascunho.data ? (
              <Button type="button" variant="ghost" onClick={() => descartar.mutate()} disabled={descartar.isPending}>
                {t("candidatura.candidaturaDialog.descartarRascunho")}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {indice > 0 ? (
              <Button type="button" variant="outline" onClick={() => irPara(ETAPAS[indice - 1].chave)}>
                {t("auth.voltar")}
              </Button>
            ) : null}
            {etapa !== "revisao" ? (
              <Button type="button" onClick={() => irPara(ETAPAS[indice + 1].chave)} disabled={carregando}>
                {t("acessibilidade.controleDeLeitura.continuar")}
              </Button>
            ) : (
              <Button type="button" onClick={() => enviar.mutate()} disabled={!podeEnviar}>
                {enviar.isPending ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> {t("comentario.enviando")}
                  </>
                ) : (
                  t("candidatura.candidaturaDialog.enviarCandidatura")
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
