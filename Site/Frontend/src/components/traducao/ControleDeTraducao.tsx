import { Languages, Loader2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIdioma } from "@/hooks/useIdioma";
import type { Traducao } from "@/hooks/useTraducao";
import type { ChaveBase } from "@/i18n/dicionarios";
import { cn } from "@/lib/utils";

/**
 * O botão "Traduzir" / "Ver original" e a mensagem de estado de um texto traduzível (publicação, comentário ou vaga).
 *
 * É pequeno de propósito (não compete com o conteúdo), mas com alvo de toque confortável. O nome do botão diz **o que** traduz e
 * **para quê** ("Traduzir a publicação para inglês"), não só "Traduzir": leitor de tela percorre botões fora do contexto. Os
 * avisos saem numa região `status`, lida uma vez, sem roubar o foco.
 */
export function ControleDeTraducao({
  traducao,
  conteudo,
  className,
}: {
  traducao: Pick<Traducao<string>, "estado" | "alternar" | "origem" | "destino" | "mensagem" | "ocupado">;
  conteudo: "publicacao" | "comentario" | "vaga";
  className?: string;
}) {
  const { t } = useIdioma();
  const { estado, alternar, origem, destino, mensagem, ocupado } = traducao;
  const traduzido = estado === "traduzido";
  const nomeDoDestino = t(`idioma.nome.${destino}` as ChaveBase);
  const nomeDaOrigem = origem ? t(`idioma.nome.${origem}` as ChaveBase) : null;

  const rotuloCompleto = traduzido
    ? t("traducao.verOriginal")
    : t("traducao.rotuloBotao", { conteudo: t(`traducao.conteudo.${conteudo}` as ChaveBase), destino: nomeDoDestino });

  const icone = ocupado ? (
    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
  ) : traduzido ? (
    <Undo2 className="size-3.5" aria-hidden="true" />
  ) : (
    <Languages className="size-3.5" aria-hidden="true" />
  );

  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={alternar}
        disabled={ocupado}
        aria-label={rotuloCompleto}
      >
        {icone}
        {ocupado ? (estado === "preparando" ? t("traducao.preparando") : t("traducao.traduzindo")) : traduzido ? t("traducao.verOriginal") : t("traducao.traduzir")}
      </Button>

      <p role="status" className="text-xs text-muted-foreground">
        {traduzido
          ? nomeDaOrigem
            ? t("traducao.traduzidoDe", { origem: nomeDaOrigem, destino: nomeDoDestino })
            : t("traducao.traduzidoPara", { destino: nomeDoDestino })
          : mensagem
            ? t(mensagem)
            : ""}
      </p>
    </div>
  );
}
