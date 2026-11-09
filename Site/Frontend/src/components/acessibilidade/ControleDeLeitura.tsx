import { Pause, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLeituraDestacada } from "@/hooks/useLeituraDestacada";
import { useIdioma } from "@/hooks/useIdioma";
import type { ChaveBase } from "@/i18n/dicionarios";

const EXPLICACAO_DO_MODO = {
  palavra: "acessibilidade.controleDeLeitura.destacandoPalavra",
  estimado: "acessibilidade.controleDeLeitura.destaqueAproximado",
  frase: "acessibilidade.controleDeLeitura.destacandoFrase",
  bloco: "acessibilidade.controleDeLeitura.destacandoBloco",
} as const satisfies Record<string, ChaveBase>;

/**
 * Pausar, continuar e parar a leitura destacada. Só aparece enquanto há uma leitura. O texto do
 * modo diz como o destaque está funcionando, para ninguém achar que a voz errou quando o navegador
 * só não informa palavra por palavra. Não usa `aria-live`: quem usa leitor de tela nativo não recebe
 * anúncio repetido, e os botões têm nome próprio.
 */
export function ControleDeLeitura() {
  const { t } = useIdioma();
  const { lendo, pausado, modo, pausar, retomar, parar } = useLeituraDestacada();

  if (!lendo) return null;

  return (
    <section
      aria-label={t("acessibilidade.controleDeLeitura.controleDeLeitura")}
      className="fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-lg"
    >
      <div className="flex gap-2">
        {pausado ? (
          <Button type="button" size="sm" className="min-h-11" onClick={retomar}>
            <Play aria-hidden="true" /> {t("acessibilidade.controleDeLeitura.continuar")}
          </Button>
        ) : (
          <Button type="button" size="sm" className="min-h-11" onClick={pausar}>
            <Pause aria-hidden="true" /> {t("acessibilidade.controleDeLeitura.pausar")}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={parar}>
          <Square aria-hidden="true" /> {t("acessibilidade.barraDeVarredura.parar")}
        </Button>
      </div>
      {modo && <p className="min-w-0 flex-1 text-xs text-muted-foreground">{t(EXPLICACAO_DO_MODO[modo])}</p>}
    </section>
  );
}
