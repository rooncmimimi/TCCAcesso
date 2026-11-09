import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PainelAcessibilidade } from "@/components/acessibilidade/PainelAcessibilidade";
import { SecaoIdioma } from "@/components/configuracoes/SecaoIdioma";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useVoz } from "@/hooks/useVoz";
import { useSessao } from "@/hooks/useSessao";
import acessibilidadeService, { preferenciasDaApi, preferenciasParaApi } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";
import { useIdioma } from "@/hooks/useIdioma";
import { textoDaPagina } from "@/i18n/textoDaPagina";

export const Route = createFileRoute("/configuracoes/acessibilidade")({
  head: () => ({
    meta: [
      { title: textoDaPagina("configuracoes.acessibilidade.configuracoesDeAcessibilidade") },
      {
        name: "description",
        content:
          textoDaPagina("configuracoes.acessibilidade.ajusteContrasteTipografia"),
      },
      { property: "og:title", content: textoDaPagina("configuracoes.acessibilidade.configuracoesDeAcessibilidade") },
      { property: "og:description", content: textoDaPagina("configuracoes.acessibilidade.personalizeAAcessibilidadeE") },
    ],
  }),
  component: ConfiguracoesAcessibilidade,
});

function ConfiguracoesAcessibilidade() {
  const { t } = useIdioma();
  const { rascunho, definir, salvar, descartar, restaurar, alterado } = useAcessibilidade();
  const { limparEscolha } = useVoz();
  const { usuario, autenticado } = useSessao();
  const [salvando, setSalvando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  useEffect(() => {
    if (!autenticado) return;
    let ativo = true;
    acessibilidadeService
      .obter()
      .then((prefs) => {
        if (!ativo) return;
        const parcial = preferenciasDaApi(prefs);
        (Object.keys(parcial) as (keyof typeof parcial)[]).forEach((chave) => {
          const valor = parcial[chave];
          if (valor !== undefined) definir(chave, valor as never);
        });
      })
      .catch(() => undefined);

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado]);

  return (
    <EstruturaApp>
      <h1 className="text-3xl font-extrabold">{t("cabecalho.configAcessibilidade")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {t("configuracoes.acessibilidade.todasAsMudancasAparecem")}{" "}
        {usuario ? t("configuracoes.acessibilidade.aoSalvarAsPreferenciasFicam") : t("configuracoes.acessibilidade.semLoginAsPreferenciasFicam")}
      </p>

      <SecaoIdioma />

      <Card className="mt-6 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <PainelAcessibilidade />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-6 flex flex-wrap gap-3 border-t border-border bg-background py-4">
        <Button
          className="min-h-12 text-base"
          disabled={salvando}
          onClick={async () => {
            salvar();
            if (autenticado) {
              setSalvando(true);
              try {
                await acessibilidadeService.salvar(preferenciasParaApi(rascunho));

                toast.success(t("configuracoes.acessibilidade.preferenciasDeAcessibilidade"));
              } catch (erro) {
                toast.error(extrairMensagemErro(erro, t("configuracoes.acessibilidade.naoFoiPossivelSalvarNaSuaConta")));
              } finally {
                setSalvando(false);
              }
            } else {
              toast.success(t("configuracoes.acessibilidade.preferenciasDeAcessibilidade2"));
            }
          }}
        >
          {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          {t("configuracoes.acessibilidade.salvarPreferencias")}
        </Button>
        <Button
          variant="outline"
          className="min-h-12 text-base"
          disabled={!alterado}
          onClick={() => descartar()}
        >
          <Undo2 aria-hidden="true" /> {t("configuracoes.acessibilidade.descartarAlteracoes")}
        </Button>
        <Button
          variant="ghost"
          className="min-h-12 text-base"
          disabled={restaurando}
          onClick={async () => {
            restaurar();
            limparEscolha();
            if (autenticado) {
              setRestaurando(true);
              try {
                await acessibilidadeService.restaurar();
              } catch (erro) {
                toast.error(extrairMensagemErro(erro, t("configuracoes.acessibilidade.naoFoiPossivelRedefinirNaSua")));
              } finally {
                setRestaurando(false);
              }
            }
            toast.info(t("configuracoes.acessibilidade.preferenciasRedefinidasA"));
          }}
        >
          {restaurando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
          {t("configuracoes.acessibilidade.redefinirTudo")}
        </Button>
      </div>
    </EstruturaApp>
  );
}
