import { useEffect, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { urlArquivo } from "@/utils/arquivos";
import postagensService from "@/services/postagens.service";
import { extrairMensagemErro } from "@/services/api";
import { useT } from "@/i18n";
import type { AnexoPostagem } from "@/types";

/**
 * Imagem ou vídeo ampliado num modal na mesma página, com a URL de exibição que a API já entrega
 * assinada (sem requisição extra). Usa o `Dialog` do Radix, que já cuida de foco e Esc. "Baixar"
 * sempre busca uma URL nova no clique, porque o backend reautoriza cada download.
 */
export function LightboxMidia({
  aberto,
  onOpenChange,
  aoFecharDevolverFoco,
  itens,
  indiceInicial,
  postagemId,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Chamado ao fechar, no lugar da devolução de foco automática do Radix
   *  (ver comentário abaixo, em `onCloseAutoFocus`). */
  aoFecharDevolverFoco?: () => void;
  itens: AnexoPostagem[];
  indiceInicial: number;
  postagemId?: string;
}) {
  const t = useT();
  const tl = t.feed.lightbox;
  const tg = t.feed.galeria;
  const [indice, setIndice] = useState(indiceInicial);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (aberto) setIndice(indiceInicial);
  }, [aberto, indiceInicial]);

  const item = itens[indice];
  const temVarios = itens.length > 1;

  function irPara(novoIndice: number) {
    setIndice((novoIndice + itens.length) % itens.length);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (!temVarios) return;
    if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      irPara(indice - 1);
    } else if (evento.key === "ArrowRight") {
      evento.preventDefault();
      irPara(indice + 1);
    }
  }

  async function baixar() {
    if (!postagemId || !item || baixando) return;

    setBaixando(true);
    try {
      const url = await postagensService.urlDownloadAnexo(postagemId, item.id);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.nomeOriginal || "";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (erro) {
      toast.error(extrairMensagemErro(erro, tl.erroBaixar));
    } finally {
      setBaixando(false);
    }
  }

  // O `Dialog` é renderizado sempre, mesmo sem `item`, e o `GaleriaAnexos` nunca o desmonta.
  // Desmontar o componente no mesmo instante do `onOpenChange(false)` atrapalharia a transição de
  // fechamento do Radix e a volta do foco para o botão que abriu o lightbox.
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90dvh] w-[95vw] max-w-4xl flex-col gap-3 p-3 sm:p-4"
        onKeyDown={aoTeclar}
        onCloseAutoFocus={(evento) => {
          if (!aoFecharDevolverFoco) return;
          // Devolve o foco explicitamente: o comportamento padrão do Radix deixava o foco no
          // `<body>`, e quem navega por teclado ou voz perdia a posição.
          evento.preventDefault();
          aoFecharDevolverFoco();
        }}
      >
        {item && (
          <>
            <DialogTitle className="sr-only">
              {item.tipo === "video" ? tl.videoAmpliado : tl.imagemAmpliada}
              {item.descricao ? `: ${item.descricao}` : ""}
              {temVarios ? ` (${tl.posicao(indice + 1, itens.length)})` : ""}
            </DialogTitle>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
              {temVarios && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 z-10 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background"
                    aria-label={tl.anterior}
                    onClick={() => irPara(indice - 1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 z-10 min-h-11 min-w-11 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background"
                    aria-label={tl.proxima}
                    onClick={() => irPara(indice + 1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </>
              )}

              {item.tipo === "video" ? (
                <video
                  key={item.id}
                  src={urlArquivo(item.url)}
                  controls
                  preload="metadata"
                  className="max-h-[75dvh] w-full"
                  aria-label={item.descricao || tg.videoSemDescricao}
                >
                  {tg.navegadorSemVideo}
                </video>
              ) : (
                <img
                  key={item.id}
                  src={urlArquivo(item.url)}
                  alt={item.descricao || item.nomeOriginal || tg.imagemSemDescricao}
                  className="max-h-[75dvh] w-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm text-muted-foreground" aria-hidden="true">
                {item.descricao || (temVarios ? tl.posicao(indice + 1, itens.length) : "")}
              </p>
              {postagemId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={baixando}
                  onClick={baixar}
                  aria-label={tl.baixarAria(item.tipo === "video" ? tl.video : tl.imagem, item.nomeOriginal ?? "")}
                >
                  {baixando ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="size-4" aria-hidden="true" />
                  )}
                  {tl.baixar}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LightboxMidia;
