import { useEffect, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { urlArquivo } from "@/services/uploads.service";
import postagensService from "@/services/postagens.service";
import { extrairMensagemErro } from "@/services/api";
import type { AnexoPostagem } from "@/types";

/**
 * Visualização ampliada de imagem/vídeo — Fase 7. Substitui o antigo
 * `<a target="_blank">` (abria o arquivo em nova guia, direto na URL do
 * Storage): agora a mídia abre num modal na mesma página, usando a URL
 * de exibição que a API já entrega assinada (nenhuma requisição extra
 * só pra abrir). Construído sobre o `Dialog` (Radix) já usado em outros
 * lugares do app — foco/Esc/devolução de foco já vêm prontos dali.
 *
 * O botão "Baixar" SEMPRE busca uma URL nova na hora do clique (nunca
 * reaproveita a URL de exibição já carregada) — o backend reautoriza do
 * zero a cada download.
 */
export function LightboxMidia({
  aberto,
  onOpenChange,
  itens,
  indiceInicial,
  postagemId,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  itens: AnexoPostagem[];
  indiceInicial: number;
  postagemId?: string;
}) {
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
      toast.error(extrairMensagemErro(erro, "Não foi possível baixar o arquivo."));
    } finally {
      setBaixando(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90dvh] w-[95vw] max-w-4xl flex-col gap-3 p-3 sm:p-4"
        onKeyDown={aoTeclar}
      >
        <DialogTitle className="sr-only">
          {item.tipo === "video" ? "Vídeo ampliado" : "Imagem ampliada"}
          {item.descricao ? `: ${item.descricao}` : ""}
          {temVarios ? ` (${indice + 1} de ${itens.length})` : ""}
        </DialogTitle>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
          {temVarios && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background"
                aria-label="Mídia anterior"
                onClick={() => irPara(indice - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background"
                aria-label="Próxima mídia"
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
              aria-label={item.descricao || "Vídeo anexado à publicação, sem descrição fornecida pelo autor"}
            >
              Seu navegador não suporta a reprodução deste vídeo.
            </video>
          ) : (
            <img
              key={item.id}
              src={urlArquivo(item.url)}
              alt={item.descricao || item.nomeOriginal || "Imagem sem descrição fornecida pelo autor da publicação"}
              className="max-h-[75dvh] w-full object-contain"
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-muted-foreground" aria-hidden="true">
            {item.descricao || (temVarios ? `${indice + 1} de ${itens.length}` : "")}
          </p>
          {postagemId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={baixando}
              onClick={baixar}
              aria-label={`Baixar ${item.tipo === "video" ? "vídeo" : "imagem"}${item.nomeOriginal ? `: ${item.nomeOriginal}` : ""}`}
            >
              {baixando ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              Baixar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LightboxMidia;
