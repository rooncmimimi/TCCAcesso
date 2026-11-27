import { Copy, Maximize2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useVoz } from "@/hooks/useVoz";
import { useIdioma } from "@/hooks/useIdioma";
import { tx } from "@/i18n/frases";

type Props = {
  texto: string;
  aoMostrar: (texto: string) => void;
};

/** Copia o texto; devolve se deu certo (o navegador pode negar a área de transferência). */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);

    return true;
  } catch {
    return false;
  }
}

/**
 * Um cartão de comunicação: a frase e três ações: mostrar em tela cheia (para a outra pessoa ler),
 * ouvir em voz alta e copiar. Nada é enviado a ninguém por aqui.
 */
export function CartaoDeComunicacao({ texto, aoMostrar }: Props) {
  const { t } = useIdioma();
  const { falar } = useVoz();

  async function copiar() {
    if (await copiarTexto(texto)) toast.success(t("comunicacao.cartaoDeComunicacao.fraseCopiada"));
    else toast.error(t("comunicacao.cartaoDeComunicacao.naoFoiPossivelCopiarSelecioneO"));
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-base font-semibold leading-snug">{texto}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11 gap-2" onClick={() => aoMostrar(texto)} aria-label={t("comunicacao.cartaoDeComunicacao.mostrarEmTelaCheia", { var1: texto })}>
          <Maximize2 className="size-4" aria-hidden="true" /> {t("comunicacao.cartaoDeComunicacao.mostrar")}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => falar(texto)} aria-label={tx`Ouvir: ${texto}`}>
          <Volume2 className="size-4" aria-hidden="true" /> {t("comunicacao.cartaoDeComunicacao.ouvir")}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => void copiar()} aria-label={tx`Copiar: ${texto}`}>
          <Copy className="size-4" aria-hidden="true" /> {t("comunicacao.cartaoDeComunicacao.copiar")}
        </Button>
      </div>
    </li>
  );
}
