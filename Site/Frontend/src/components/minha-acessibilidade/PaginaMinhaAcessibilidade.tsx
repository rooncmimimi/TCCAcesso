import { useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { extrairMensagemErro } from "@/services/api";
import { minhaAcessibilidadeService } from "@/services/adaptacoes.service";
import type { CatalogoDeAdaptacoes, ItemDoCatalogo, MinhaAcessibilidade } from "@/types/adaptacoes";
import { useIdioma } from "@/hooks/useIdioma";

const mesmaLista = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Minha Acessibilidade: a central das adaptações profissionais e das preferências de comunicação.
 * Privada: só a própria pessoa vê. Nada daqui vai para uma empresa sozinho; o que for enviado é
 * escolhido a cada candidatura, depois de uma prévia. Não pede diagnóstico.
 */
export function PaginaMinhaAcessibilidade() {
  const { t } = useIdioma();
  const catalogo = useQuery({ queryKey: ["minha-acessibilidade", "catalogo"], queryFn: () => minhaAcessibilidadeService.catalogo(), staleTime: 60 * 60 * 1000 });
  const minha = useQuery({ queryKey: ["minha-acessibilidade"], queryFn: () => minhaAcessibilidadeService.obter() });

  if (catalogo.isLoading || minha.isLoading) {
    return (
      <div role="status" className="mt-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Carregando…
      </div>
    );
  }

  if (catalogo.isError || minha.isError || !catalogo.data || !minha.data) {
    return (
      <div role="alert" className="mt-8 space-y-2 text-sm text-destructive">
        <p>{t("minha-acessibilidade.paginaMinhaAcessibilidade.naoFoiPossivelCarregarASua")}</p>
        <Button variant="outline" size="sm" onClick={() => { void catalogo.refetch(); void minha.refetch(); }}>
          {t("raiz.tentarNovamente")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <section aria-labelledby="como-funciona" className="rounded-lg border bg-muted/40 p-4 text-sm">
        <h2 id="como-funciona" className="font-bold">
          {t("minha-acessibilidade.paginaMinhaAcessibilidade.comoIstoFunciona")}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("minha-acessibilidade.paginaMinhaAcessibilidade.soVoceVeEstaPaginaVoceNao")}</li>
          <li>{t("minha-acessibilidade.paginaMinhaAcessibilidade.nadaDaquiEEnviadoAUmaEmpresa")}</li>
          <li>{t("minha-acessibilidade.paginaMinhaAcessibilidade.oQueVoceAutorizarViraUmaCopia")}</li>
          <li>{t("minha-acessibilidade.paginaMinhaAcessibilidade.vocePodeRetirarUmaAutorizacao")}</li>
        </ul>
      </section>

      <SecaoAdaptacoes catalogo={catalogo.data} minha={minha.data} />
      <SecaoComunicacao catalogo={catalogo.data} minha={minha.data} />
      <SecaoPrivacidade minha={minha.data} />

      <p className="text-sm text-muted-foreground">
        Quer treinar antes de se candidatar de verdade?{" "}
        <Link to="/simulador" className="font-semibold text-primary underline">
          {t("minha-acessibilidade.paginaMinhaAcessibilidade.abraOSimuladorDeCandidaturaE")}
        </Link>
        .
      </p>
    </div>
  );
}

/** Salva uma parte de Minha Acessibilidade e atualiza o cache com o que o servidor devolveu. */
function useSalvarMinha(mensagem: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executar: () => Promise<MinhaAcessibilidade>) => executar(),
    onSuccess: (resultado) => {
      queryClient.setQueryData(["minha-acessibilidade"], resultado);
      toast.success(mensagem);
    },
    onError: (erro) => toast.error(extrairMensagemErro(erro)),
  });
}

function SecaoAdaptacoes({ catalogo, minha }: { catalogo: CatalogoDeAdaptacoes; minha: MinhaAcessibilidade }) {
  const { t } = useIdioma();
  const idBase = useId();
  const [escolhidas, setEscolhidas] = useState<string[]>(minha.adaptacoes);
  const [observacao, setObservacao] = useState(minha.observacao ?? "");

  useEffect(() => {
    setEscolhidas(minha.adaptacoes);
    setObservacao(minha.observacao ?? "");
  }, [minha.adaptacoes, minha.observacao]);

  const salvar = useSalvarMinha("Adaptações salvas.");

  const alterado = !mesmaLista(escolhidas, minha.adaptacoes) || observacao.trim() !== (minha.observacao ?? "");

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-xl">{t("minha-acessibilidade.paginaMinhaAcessibilidade.minhasAdaptacoesProfissionais")}</CardTitle>
        <CardDescription>{t("minha-acessibilidade.paginaMinhaAcessibilidade.marqueOQueAjudaVoceAParticipar")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            salvar.mutate(() => minhaAcessibilidadeService.salvarAdaptacoes({ adaptacoes: escolhidas, observacao: observacao.trim() || null }));
          }}
        >
          {catalogo.grupos.map((grupo) => (
            <fieldset key={grupo.chave} className="space-y-2">
              <legend className="text-sm font-bold">{grupo.rotulo}</legend>
              <ul className="space-y-1">
                {catalogo.adaptacoes
                  .filter((a) => a.grupo === grupo.chave)
                  .map((item) => (
                    <li key={item.chave} className="flex items-start gap-3 py-1">
                      <Checkbox
                        id={`${idBase}-${item.chave}`}
                        className="mt-1"
                        checked={escolhidas.includes(item.chave)}
                        onCheckedChange={(v) => setEscolhidas((atuais) => (v === true ? [...atuais, item.chave] : atuais.filter((c) => c !== item.chave)))}
                      />
                      <Label htmlFor={`${idBase}-${item.chave}`} className="text-sm font-normal leading-snug">
                        {item.rotulo}
                      </Label>
                    </li>
                  ))}
              </ul>
            </fieldset>
          ))}

          <div className="space-y-2">
            <Label htmlFor={`${idBase}-obs`}>{t("minha-acessibilidade.paginaMinhaAcessibilidade.observacaoOpcional")}</Label>
            <Textarea id={`${idBase}-obs`} rows={3} maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} aria-describedby={`${idBase}-obs-ajuda`} />
            <p id={`${idBase}-obs-ajuda`} className="text-xs text-muted-foreground">
              Escreva o que ajuda, por exemplo “prefiro instruções curtas, uma por vez”. Não escreva diagnóstico, laudo, nome de doença nem medicação: isso não é necessário.
            </p>
          </div>

          <Button type="submit" disabled={!alterado || salvar.isPending} className="min-h-11">
            {salvar.isPending ? "Salvando…" : "Salvar adaptações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecaoComunicacao({ catalogo, minha }: { catalogo: CatalogoDeAdaptacoes; minha: MinhaAcessibilidade }) {
  const { t } = useIdioma();
  const idBase = useId();
  const c = minha.comunicacao;
  const [preferidos, setPreferidos] = useState<string[]>(c.canaisPreferidos);
  const [evitar, setEvitar] = useState<string[]>(c.canaisAEvitar);
  const [horario, setHorario] = useState(c.melhorHorario ?? "");
  const [observacao, setObservacao] = useState(c.observacao ?? "");

  useEffect(() => {
    setPreferidos(c.canaisPreferidos);
    setEvitar(c.canaisAEvitar);
    setHorario(c.melhorHorario ?? "");
    setObservacao(c.observacao ?? "");
  }, [c.canaisPreferidos, c.canaisAEvitar, c.melhorHorario, c.observacao]);

  const salvar = useSalvarMinha("Preferências de comunicação salvas.");

  const conflito = preferidos.filter((p) => evitar.includes(p));
  const alterado =
    !mesmaLista(preferidos, c.canaisPreferidos) || !mesmaLista(evitar, c.canaisAEvitar) || horario.trim() !== (c.melhorHorario ?? "") || observacao.trim() !== (c.observacao ?? "");

  const lista = (itens: ItemDoCatalogo[], marcadas: string[], aoMudar: (v: string[]) => void, prefixo: string) => (
    <ul className="space-y-1">
      {itens.map((item) => (
        <li key={item.chave} className="flex items-start gap-3 py-1">
          <Checkbox
            id={`${idBase}-${prefixo}-${item.chave}`}
            className="mt-1"
            checked={marcadas.includes(item.chave)}
            onCheckedChange={(v) => aoMudar(v === true ? [...marcadas, item.chave] : marcadas.filter((x) => x !== item.chave))}
          />
          <Label htmlFor={`${idBase}-${prefixo}-${item.chave}`} className="text-sm font-normal leading-snug">
            {item.rotulo}
          </Label>
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-xl">{t("candidatura.escolhaDeAdaptacoes.comoPrefiroSerContatadoA")}</CardTitle>
        <CardDescription>{t("minha-acessibilidade.paginaMinhaAcessibilidade.umaPreferenciaDeContatoNaoE")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (conflito.length > 0) return;
            salvar.mutate(() =>
              minhaAcessibilidadeService.salvarComunicacao({
                canaisPreferidos: preferidos,
                canaisAEvitar: evitar,
                melhorHorario: horario.trim() || null,
                observacao: observacao.trim() || null,
              }),
            );
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">{t("minha-acessibilidade.paginaMinhaAcessibilidade.canaisQueEuPrefiro")}</legend>
            {lista(catalogo.canaisPreferidos, preferidos, setPreferidos, "pref")}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">{t("minha-acessibilidade.paginaMinhaAcessibilidade.canaisQueEuPrefiroEvitar")}</legend>
            {lista(catalogo.canaisAEvitar, evitar, setEvitar, "evitar")}
          </fieldset>

          {conflito.length > 0 ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {t("minha-acessibilidade.paginaMinhaAcessibilidade.umMesmoCanalNaoPodeEstarEntre")}
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`${idBase}-horario`}>{t("minha-acessibilidade.paginaMinhaAcessibilidade.melhorHorarioParaContato")}</Label>
            <Input id={`${idBase}-horario`} maxLength={120} value={horario} onChange={(e) => setHorario(e.target.value)} placeholder={t("minha-acessibilidade.paginaMinhaAcessibilidade.exDeManhaDepoisDas14h")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idBase}-obs`}>{t("minha-acessibilidade.paginaMinhaAcessibilidade.observacaoOpcional")}</Label>
            <Textarea id={`${idBase}-obs`} rows={2} maxLength={300} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          <Button type="submit" disabled={!alterado || conflito.length > 0 || salvar.isPending} className="min-h-11">
            {salvar.isPending ? "Salvando…" : "Salvar preferências"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SecaoPrivacidade({ minha }: { minha: MinhaAcessibilidade }) {
  const { t } = useIdioma();
  const idBase = useId();
  const ligado = minha.privacidade.exibirDeficienciaNoPerfil;
  const salvar = useSalvarMinha("Privacidade atualizada.");

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-xl">{t("minha-acessibilidade.paginaMinhaAcessibilidade.privacidadeDaCategoriaDe")}</CardTitle>
        <CardDescription>
          {t("minha-acessibilidade.paginaMinhaAcessibilidade.aCategoriaQueVoceDeclarouNo")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {minha.deficiencias.length > 0 ? (
          <p className="text-sm">
            Categoria declarada: <strong>{minha.deficiencias.map((d) => d.nome).join(", ")}</strong>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("minha-acessibilidade.paginaMinhaAcessibilidade.voceNaoDeclarouNenhuma")}</p>
        )}

        <div className="flex items-start gap-3">
          <Switch id={`${idBase}-exibir`} checked={ligado} disabled={salvar.isPending} onCheckedChange={(v) => salvar.mutate(() => minhaAcessibilidadeService.salvarPrivacidade(v))} aria-describedby={`${idBase}-exibir-ajuda`} />
          <div>
            <Label htmlFor={`${idBase}-exibir`} className="text-sm font-semibold">
              {t("minha-acessibilidade.paginaMinhaAcessibilidade.mostrarACategoriaDeDeficiencia")}
            </Label>
            <p id={`${idBase}-exibir-ajuda`} className="mt-1 text-xs text-muted-foreground">
              Desligado, ninguém além de você vê. Ligar isto não compartilha nenhuma outra informação nem autoriza nada em candidaturas: cada candidatura continua sendo uma escolha
              separada. Você pode mudar quando quiser.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
