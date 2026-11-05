import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MidiaDaVaga } from "@/types/ambiente";

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
        Vídeo da vaga em Libras
      </h2>
      {midia.descricao ? <p className="text-sm">{midia.descricao}</p> : null}

      {midia.video.url && !erro ? (
        <>
          <video
            ref={videoRef}
            controls
            preload="metadata"
            playsInline
            aria-label={`Vídeo em Libras: ${tituloDaVaga}`}
            className="aspect-video w-full max-w-3xl rounded-lg bg-black"
            onError={() => setErro(true)}
          >
            <source src={midia.video.url} type={midia.video.tipoMime} />
            {urlDaLegenda ? <track kind="captions" src={urlDaLegenda} srcLang="pt-BR" label="Português" default /> : null}
            Seu navegador não reproduz este vídeo. Leia a transcrição abaixo.
          </video>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2" onClick={() => void ampliar()}>
              <Maximize2 className="size-4" aria-hidden="true" /> Ampliar o vídeo
            </Button>
            {!urlDaLegenda ? <p className="text-xs text-muted-foreground">Este vídeo não tem legenda. A transcrição está logo abaixo.</p> : null}
          </div>
        </>
      ) : (
        <p role="alert" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          Não foi possível carregar o vídeo agora. A transcrição abaixo tem o mesmo conteúdo.
        </p>
      )}

      <details open className="rounded-lg border border-border p-3" id={`${idBase}-transcricao`}>
        <summary className="min-h-11 cursor-pointer font-semibold text-primary">Transcrição do vídeo</summary>
        <p className="mt-2 whitespace-pre-line text-sm">{midia.transcricao}</p>
      </details>
    </section>
  );
}
