import { useIdioma } from "@/hooks/useIdioma";
/**
 * Orientação contextual para descrever uma imagem (texto alternativo). Fixa e escrita à mão: não
 * analisa a imagem, só ensina a pessoa a descrevê-la. Fica fechada por padrão para não pesar na tela.
 */
export function OrientacaoDeDescricao() {
  const { t } = useIdioma();
  return (
    <details className="rounded-md border border-border bg-muted/30 p-2 text-[11px] leading-snug">
      <summary className="min-h-8 cursor-pointer text-xs font-semibold text-primary">{t("feed.orientacaoDeDescricao.comoDescreverBemEstaImagem")}</summary>
      <div className="mt-2 space-y-2">
        <p>
          {t("feed.orientacaoDeDescricao.aDescricaoELidaPorQuemUsa")}
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("feed.orientacaoDeDescricao.digaOQueImportaQuemOuOQue")}</li>
          <li>{t("feed.orientacaoDeDescricao.seAImagemTemTextoUmCartazUm")}</li>
          <li>{t("feed.orientacaoDeDescricao.sejaBreveUmaOuDuasFrasesNao")}</li>
          <li>{t("feed.orientacaoDeDescricao.conteOQueAImagemAcrescentaASua")}</li>
        </ul>
        <p>
          <span className="font-semibold">{t("feed.orientacaoDeDescricao.imagemInformativa")}</span> mostra algo que a publicação precisa. Descreva sempre.
          <br />
          <span className="font-semibold">{t("feed.orientacaoDeDescricao.imagemDecorativa")}</span> só enfeita e não traz informação nova. Marque “decorativa” e ela será ignorada por leitores de tela.
        </p>
        <p className="italic">{t("feed.orientacaoDeDescricao.exemploEquipeDeCincoPessoas")}</p>
      </div>
    </details>
  );
}
