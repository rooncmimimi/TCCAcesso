import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
import { DicaDeCampoBotao } from "@/components/acessibilidade/DicaDeCampoBotao";
import { AvisoDeRascunho } from "@/components/acessibilidade/AvisoDeRascunho";
import { AvaliadorDeVagaPainel } from "@/components/vagas/AvaliadorDeVagaPainel";
import { SecaoAmbienteDaVaga } from "@/components/vagas/SecaoAmbienteDaVaga";
import { VideoDaVagaGestao } from "@/components/vagas/VideoDaVagaGestao";
import { formularioDaVaga, origensDoMapa, payloadDoAmbiente, type FormularioDoAmbiente } from "@/lib/ambienteDaVagaForm";
import { lerDadosParaAvaliar } from "@/lib/dadosDoFormularioDaVaga";
import { useRascunhoDeFormulario } from "@/hooks/useRascunhoDeFormulario";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CidadeAutocomplete } from "@/components/CidadeAutocomplete";
import { extrairMensagemErro } from "@/services/api";
import vagasService from "@/services/vagas.service";
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
import type { PublicoAlvoVaga, RecursoAcessibilidadeVaga, Vaga } from "@/types";

/** Os únicos campos deste formulário que entram no rascunho automático. */
const CAMPOS_DO_RASCUNHO = ["titulo", "descricao", "requisitos", "requisitosDesejaveis", "atividades", "etapasSelecao", "beneficios", "acessibilidade"] as const;

/**
 * Edição de uma vaga já publicada (PUT /vagas/:id). Mesmos campos e limites
 * do formulário de criação: o backend já valida posse e aprovação da
 * empresa (`garantirDono` + `garantirEmpresaAprovada`).
 */
export function EditarVagaDialog({ vaga, children }: { vaga: Vaga; children: ReactNode }) {
  const { t } = useIdioma();
  const [aberto, setAberto] = useState(false);
  const [publicoAlvo, setPublicoAlvo] = useState<PublicoAlvoVaga>(vaga.publicoAlvo ?? "pcd");
  const [recursosAcessibilidade, setRecursosAcessibilidade] = useState<RecursoAcessibilidadeVaga[]>(
    vaga.recursosAcessibilidade ?? [],
  );
  const [cidade, setCidade] = useState(vaga.cidade ?? "");
  const [estado, setEstado] = useState(vaga.estado ?? "");
  const queryClient = useQueryClient();
  // Rascunho só dos textos da vaga (nada pessoal): ver `lib/rascunhoDeFormulario.ts`.
  const rascunho = useRascunhoDeFormulario({ chave: `vaga:${vaga.id}`, campos: CAMPOS_DO_RASCUNHO, ativo: aberto });
  const formRef = useRef<HTMLFormElement | null>(null);
  const [ambiente, setAmbiente] = useState<FormularioDoAmbiente>(() => formularioDaVaga(vaga));
  const [video, setVideo] = useState<{ legenda: boolean } | null>(null);

  // Reabrir o diálogo sempre reflete os dados mais recentes da vaga.
  useEffect(() => {
    if (aberto) {
      setCidade(vaga.cidade ?? "");
      setEstado(vaga.estado ?? "");
      setAmbiente(formularioDaVaga(vaga));
    }
    // O ambiente é relido da vaga a cada abertura; `vaga` inteira mudaria a cada atualização do cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, vaga.cidade, vaga.estado, vaga.id]);

  function alternarRecurso(recurso: RecursoAcessibilidadeVaga, marcado: boolean) {
    setRecursosAcessibilidade((atuais) =>
      marcado ? [...atuais, recurso] : atuais.filter((r) => r !== recurso),
    );
  }
  const salvar = useMutation({
    mutationFn: (payload: Record<string, unknown>) => vagasService.atualizar(vaga.id, payload),
    onSuccess: () => {
      // O toast já é lido pelo `useLeituraAutomatica`; falar aqui também duplicaria a leitura.
      toast.success(t("dashboard.editarVagaDialog.vagaAtualizadaComSucesso"));
      rascunho.limpar();
      setAberto(false);
      void queryClient.invalidateQueries({ queryKey: ["minhas-vagas"] });
      void queryClient.invalidateQueries({ queryKey: ["vaga", vaga.id] });
      void queryClient.invalidateQueries({ queryKey: ["vagas"] });
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro, t("dashboard.editarVagaDialog.naoFoiPossivelAtualizarAVaga"))),
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
      atividades: texto("atividades") || null,
      requisitosDesejaveis: texto("requisitosDesejaveis") || null,
      etapasSelecao: texto("etapasSelecao") || null,
      ...payloadDoAmbiente(ambiente),
      publicoAlvo,
      recursosAcessibilidade,
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("dashboard.editarVagaDialog.editarVaga")}</DialogTitle>
          <DialogDescription>{t("dashboard.editarVagaDialog.atualizeAsInformacoesDestaVaga")}</DialogDescription>
        </DialogHeader>

        <form
          ref={(el) => {
            formRef.current = el;
            rascunho.ref(el);
          }}
          onSubmit={enviar}
          className="space-y-4"
        >
          <AvisoDeRascunho rascunho={rascunho.rascunho} aoRestaurar={rascunho.restaurar} aoDescartar={rascunho.descartar} />
          <div className="space-y-2">
            <Label htmlFor={`titulo-${vaga.id}`}>{t("dashboard.editarVagaDialog.tituloDaVaga")}</Label>
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
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Label htmlFor={`descricao-${vaga.id}`}>{t("vagaDetalhe.descricao")}</Label>
              <DicaDeCampoBotao dica="vagaDescricao" nomeDoCampo={t("dashboard.editarVagaDialog.descricaoDaVaga")} />
            </div>
            <Textarea
              id={`descricao-${vaga.id}`}
              name="descricao"
              required
              minLength={20}
              rows={5}
              defaultValue={vaga.descricao}
            />
            <p className="text-xs text-muted-foreground">{t("dashboard.editarVagaDialog.minimoDe20Caracteres")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <Label htmlFor={`requisitos-${vaga.id}`}>{t("dashboard.editarVagaDialog.requisitosObrigatorios")}</Label>
                <DicaDeCampoBotao dica="vagaRequisitos" nomeDoCampo={t("vagaDetalhe.requisitos")} />
              </div>
              <Textarea id={`requisitos-${vaga.id}`} name="requisitos" rows={3} defaultValue={vaga.requisitos ?? ""} />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <Label htmlFor={`beneficios-${vaga.id}`}>{t("vagaDetalhe.beneficios")}</Label>
                <DicaDeCampoBotao dica="vagaBeneficios" nomeDoCampo={t("vagaDetalhe.beneficios")} />
              </div>
              <Textarea id={`beneficios-${vaga.id}`} name="beneficios" rows={3} defaultValue={vaga.beneficios ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Label htmlFor="atividades">{t("dashboard.editarVagaDialog.atividadesUmaPorLinha")}</Label>
              <DicaDeCampoBotao dica="vagaAtividades" nomeDoCampo={t("dashboard.editarVagaDialog.atividades")} />
            </div>
            <Textarea id="atividades" name="atividades" rows={3} maxLength={4000} defaultValue={vaga.atividades ?? ""} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <Label htmlFor="requisitosDesejaveis">{t("dashboard.editarVagaDialog.requisitosDesejaveis")}</Label>
                <DicaDeCampoBotao dica="vagaRequisitosDesejaveis" nomeDoCampo={t("dashboard.editarVagaDialog.requisitosDesejaveis")} />
              </div>
              <Textarea id="requisitosDesejaveis" name="requisitosDesejaveis" rows={3} maxLength={4000} defaultValue={vaga.requisitosDesejaveis ?? ""} />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <Label htmlFor="etapasSelecao">{t("dashboard.editarVagaDialog.etapasDaSelecao")}</Label>
                <DicaDeCampoBotao dica="vagaEtapas" nomeDoCampo={t("dashboard.editarVagaDialog.etapasDaSelecao")} />
              </div>
              <Textarea id="etapasSelecao" name="etapasSelecao" rows={3} maxLength={4000} defaultValue={vaga.etapasSelecao ?? ""} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={`modalidade-${vaga.id}`}>{t("filtro.modalidade")}</Label>
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
              <Label htmlFor={`contrato-${vaga.id}`}>{t("dashboard.editarVagaDialog.contrato")}</Label>
              <select
                id={`contrato-${vaga.id}`}
                name="contrato"
                defaultValue={vaga.contrato ?? "clt"}
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
              <Label htmlFor={`salario-${vaga.id}`}>{t("dashboard.editarVagaDialog.salarioR")}</Label>
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
              <Label htmlFor={`cidade-${vaga.id}`}>{t("filtro.cidade")}</Label>
              <CidadeAutocomplete
                id={`cidade-${vaga.id}`}
                name="cidade"
                value={cidade}
                onChange={setCidade}
                estado={estado}
                aria-label={t("filtro.cidade")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`estado-${vaga.id}`}>{t("dashboard.editarVagaDialog.estadoUf")}</Label>
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
              <Label htmlFor={`cargaHoraria-${vaga.id}`}>{t("vagaDetalhe.cargaHoraria")}</Label>
              <Input
                id={`cargaHoraria-${vaga.id}`}
                name="cargaHoraria"
                placeholder={t("dashboard.editarVagaDialog.40hSemanais")}
                defaultValue={vaga.cargaHoraria ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`publicoAlvo-${vaga.id}`}>{t("filtro.publico")}</Label>
            <select
              id={`publicoAlvo-${vaga.id}`}
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
            <legend className="text-sm font-medium">{t("dashboard.editarVagaDialog.recursosDeAcessibilidadeDesta")}</legend>
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
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Label htmlFor={`acessibilidade-${vaga.id}`}>{t("vagaDetalhe.detalhesAcessibilidade")}</Label>
              <DicaDeCampoBotao dica="vagaAcessibilidade" nomeDoCampo={t("dashboard.editarVagaDialog.detalhesDeAcessibilidade")} />
            </div>
            <Textarea
              id={`acessibilidade-${vaga.id}`}
              name="acessibilidade"
              rows={3}
              placeholder={t("dashboard.editarVagaDialog.descrevaQualquerRecursoQueNao")}
              defaultValue={vaga.acessibilidade ?? ""}
            />
          </div>

          <details className="rounded-lg border border-border p-3">
            <summary className="min-h-11 cursor-pointer text-sm font-bold text-primary">{t("dashboard.editarVagaDialog.ambienteDeTrabalhoEEntrevista")}</summary>
            <div className="mt-3">
              <SecaoAmbienteDaVaga valor={ambiente} aoMudar={setAmbiente} origens={origensDoMapa(vaga.acessibilidadeFisica)} />
            </div>
          </details>

          <VideoDaVagaGestao vagaId={vaga.id} aoMudar={setVideo} />

          <AvaliadorDeVagaPainel obterDados={() => lerDadosParaAvaliar(formRef.current, { ambiente, recursos: recursosAcessibilidade, video })} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              {t("post.cancelar")}
            </Button>
            <Button type="submit" disabled={salvar.isPending} className="min-h-11 gap-2">
              {salvar.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t("dashboard.editarVagaDialog.salvarAlteracoes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
