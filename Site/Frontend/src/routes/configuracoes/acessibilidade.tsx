import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { EstruturaApp } from "@/layouts/EstruturaApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PainelAcessibilidade } from "@/components/acessibilidade/PainelAcessibilidade";
import { useAcessibilidade } from "@/hooks/useAcessibilidade";
import { useVoz } from "@/hooks/useVoz";
import { useSessao } from "@/hooks/useSessao";
import acessibilidadeService, { preferenciasDaApi, preferenciasParaApi } from "@/services/acessibilidade.service";
import { extrairMensagemErro } from "@/services/api";
import { metaPagina, dic, useT } from "@/i18n";

export const Route = createFileRoute("/configuracoes/acessibilidade")({
  head: () => metaPagina(dic().configuracoes.acessibilidade.meta),
  component: ConfiguracoesAcessibilidade,
});

function ConfiguracoesAcessibilidade() {
  const t = useT();
  const ta = t.configuracoes.acessibilidade;
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
      <h1 className="text-3xl font-extrabold">{ta.titulo}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        {ta.texto} {usuario ? ta.comConta : ta.semConta}
      </p>

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

                toast.success(ta.salvoConta);
              } catch (erro) {
                toast.error(extrairMensagemErro(erro, ta.erroSalvar));
              } finally {
                setSalvando(false);
              }
            } else {
              toast.success(ta.salvoDispositivo);
            }
          }}
        >
          {salvando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          {ta.salvar}
        </Button>
        <Button
          variant="outline"
          className="min-h-12 text-base"
          disabled={!alterado}
          onClick={() => descartar()}
        >
          <Undo2 aria-hidden="true" /> {ta.descartar}
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
                toast.error(extrairMensagemErro(erro, ta.erroRedefinir));
              } finally {
                setRestaurando(false);
              }
            }
            toast.info(ta.redefinido);
          }}
        >
          {restaurando ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
          {ta.redefinir}
        </Button>
      </div>
    </EstruturaApp>
  );
}
