import { useId } from "react";
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
 *
 * Quando a tradução depende de um serviço fora do aparelho, a pergunta acontece **aqui na tela**, não num diálogo: quem usa
 * leitor de tela ou acionador não é arrancado do lugar onde estava, e a explicação fica junto do botão que a causou.
 */
export function ControleDeTraducao({
  traducao,
  conteudo,
  className,
}: {
  traducao: Pick<Traducao<string>, "estado" | "alternar" | "origem" | "destino" | "mensagem" | "ocupado" | "precisaDeAutorizacao" | "autorizar" | "recusar" | "viaServicoOnline">;
  conteudo: "publicacao" | "comentario" | "vaga";
  className?: string;
}) {
  const { t } = useIdioma();
  const idDoAviso = useId();
  const { estado, alternar, origem, destino, mensagem, ocupado, precisaDeAutorizacao, autorizar, recusar, viaServicoOnline } = traducao;
  const traduzido = estado === "traduzido";
  const nomeDoDestino = t(`idioma.nome.${destino}` as ChaveBase);
  const nomeDaOrigem = origem ? t(`idioma.nome.${origem}` as ChaveBase) : null;
  const nomeDoConteudo = t(`traducao.conteudo.${conteudo}` as ChaveBase);

  const rotuloCompleto = traduzido ? t("traducao.verOriginal") : t("traducao.rotuloBotao", { conteudo: nomeDoConteudo, destino: nomeDoDestino });

  const icone = ocupado ? (
    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
  ) : traduzido ? (
    <Undo2 className="size-3.5" aria-hidden="true" />
  ) : (
    <Languages className="size-3.5" aria-hidden="true" />
  );

  const traducaoFeita = traduzido ? (nomeDaOrigem ? t("traducao.traduzidoDe", { origem: nomeDaOrigem, destino: nomeDoDestino }) : t("traducao.traduzidoPara", { destino: nomeDoDestino })) : null;

  return (
    <div className={cn("mt-2 space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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

        <p id={idDoAviso} role="status" className="text-xs text-muted-foreground">
          {traducaoFeita ? `${traducaoFeita}${viaServicoOnline ? ` ${t("traducao.viaServicoOnline")}` : ""}` : mensagem ? t(mensagem) : ""}
        </p>
      </div>

      {/*
        A escolha fica ao lado da explicação que a motivou (o texto sai do aparelho), e não num diálogo:
        "Agora não" é um caminho de volta de verdade, não um X de canto.
      */}
      {precisaDeAutorizacao ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={autorizar} aria-describedby={idDoAviso}>
            {t("traducao.autorizar")}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={recusar} aria-describedby={idDoAviso}>
            {t("traducao.recusar")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
