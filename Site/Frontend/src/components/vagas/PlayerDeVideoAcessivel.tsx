import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MidiaDaVaga } from "@/types/ambiente";
import { useIdioma } from "@/hooks/useIdioma";

/**
 * Player do vídeo da vaga em Libras, acessível:
 *  - controles NATIVOS do navegador (`controls`): operáveis por teclado e anunciados por leitores de tela;
 *  - LEGENDA em WebVTT, quando a empresa enviou, ligada como `<track>` a partir de um Blob local (sem CORS);
 *  - TRANSCRIÇÃO em texto logo abaixo, sempre, para quem não vê nem ouve o vídeo;
 *  - AMPLIAÇÃO: botão de tela cheia (e o zoom do navegador continua valendo; o vídeo acompanha a largura);
 *  - nunca toca sozinho, e não tem loop.
 *
 * O ACESSO não traduz nada para Libras: o vídeo é o que a empresa gravou.
 */
export function PlayerDeVideoAcessivel({ midia, tituloDaVaga }: { midia: MidiaDaVaga; tituloDaVaga: string }) {
  const { t } = useIdioma();
  const idBase = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [erro, setErro] = useState(false);

  // A legenda vira um Blob local: o <track> exige mesma origem ou CORS, e assim não depende de nenhum dos dois.
  const urlDaLegenda = useMemo(() => (midia.legendaVtt ? URL.createObjectURL(new Blob([midia.legendaVtt], { type: "text/vtt" })) : null), [midia.legendaVtt]);

  useEffect(
    () => () => {
      if (urlDaLegenda) URL.revokeObjectURL(urlDaLegenda);
    },
    [urlDaLegenda],
  );

  async function ampliar() {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await video.requestFullscreen();
    } catch {
      /* O navegador pode recusar tela cheia: o zoom do navegador continua funcionando. */
    }
  }

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="space-y-3">
      <h2 id={`${idBase}-titulo`} className="text-lg font-bold">
        {t("vagas.playerDeVideoAcessivel.videoDaVagaEmLibras")}
      </h2>
      {midia.descricao ? <p className="text-sm">{midia.descricao}</p> : null}

      {midia.video.url && !erro ? (
        <>
          <video
            ref={videoRef}
            controls
            preload="metadata"
            playsInline
            aria-label={t("vagas.playerDeVideoAcessivel.videoEmLibras", { var1: tituloDaVaga })}
            className="aspect-video w-full max-w-3xl rounded-lg bg-black"
            onError={() => setErro(true)}
          >
            <source src={midia.video.url} type={midia.video.tipoMime} />
            {urlDaLegenda ? <track kind="captions" src={urlDaLegenda} srcLang="pt-BR" label={t("vagas.playerDeVideoAcessivel.portugues")} default /> : null}
            {t("vagas.playerDeVideoAcessivel.seuNavegadorNaoReproduzEste")}
          </video>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" onClick={() => void ampliar()}>
              <Maximize2 className="size-4" aria-hidden="true" /> {t("vagas.playerDeVideoAcessivel.ampliarOVideo")}
            </Button>
            {!urlDaLegenda ? <p className="text-xs text-muted-foreground">{t("vagas.playerDeVideoAcessivel.esteVideoNaoTemLegendaA")}</p> : null}
          </div>
        </>
      ) : (
        <p role="alert" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          {t("vagas.playerDeVideoAcessivel.naoFoiPossivelCarregarOVideo")}
        </p>
      )}

      <details open className="rounded-lg border border-border p-3" id={`${idBase}-transcricao`}>
        <summary className="min-h-11 cursor-pointer font-semibold text-primary">{t("vagas.playerDeVideoAcessivel.transcricaoDoVideo")}</summary>
        <p className="mt-2 whitespace-pre-line text-sm">{midia.transcricao}</p>
      </details>
    </section>
  );
}
