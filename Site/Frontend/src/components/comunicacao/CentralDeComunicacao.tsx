import { useId, useState } from "react";
import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CartaoDeComunicacao } from "@/components/comunicacao/CartaoDeComunicacao";
import { CARTOES_PADRAO, GRUPOS_DE_CARTOES } from "@/dados/cartoesDeComunicacao";
import { useVoz } from "@/hooks/useVoz";
import { useIdioma } from "@/hooks/useIdioma";
import { localeAtual } from "@/i18n/frases";

/**
 * Central de comunicação alternativa: cartões prontos, em grupos. Cada cartão pode ser mostrado em
 * tela cheia (letra enorme, para a outra pessoa ler), ouvido em voz alta ou copiado. Nenhum cartão é
 * enviado por esta tela: para usar numa conversa, a pessoa os encontra também dentro das Mensagens.
 */
export function CentralDeComunicacao() {
  const { t } = useIdioma();
  const idBase = useId();
  const { falar } = useVoz();
  const [mostrando, setMostrando] = useState<string | null>(null);

  return (
    <div className="mt-6 space-y-8">
      {GRUPOS_DE_CARTOES.map((grupo) => (
        <section key={grupo.id} aria-labelledby={`${idBase}-${grupo.id}`} className="space-y-3">
          <div>
            <h2 id={`${idBase}-${grupo.id}`} className="text-xl font-bold">
              {grupo.titulo}
            </h2>
            <p className="text-sm text-muted-foreground">{grupo.descricao}</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CARTOES_PADRAO.filter((c) => c.grupo === grupo.id).map((c) => (
              <CartaoDeComunicacao key={c.id} texto={c.texto} aoMostrar={setMostrando} />
            ))}
          </ul>
        </section>
      ))}

      <Dialog open={mostrando !== null} onOpenChange={(aberto) => (!aberto ? setMostrando(null) : undefined)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle className="sr-only">{t("comunicacao.centralDeComunicacao.cartaoDeComunicacao")}</DialogTitle>
          <DialogDescription className="sr-only">{t("comunicacao.centralDeComunicacao.aFraseEmLetrasGrandesPara")}</DialogDescription>
          <p className="py-8 text-center text-4xl font-extrabold leading-tight sm:text-5xl" lang={localeAtual()}>
            {mostrando}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => mostrando && falar(mostrando)}>
              <Volume2 className="size-4" aria-hidden="true" /> {t("acessibilidade.textoOuvivel.ouvir")}
            </Button>
            <Button type="button" className="min-h-11" onClick={() => setMostrando(null)}>
              {t("ui.dialog.fechar")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
