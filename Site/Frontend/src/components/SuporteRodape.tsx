import { Link } from "@tanstack/react-router";
import { Accessibility, Lock, Mail } from "lucide-react";

import { useIdioma } from "@/hooks/useIdioma";

/**
 * Área de suporte no final das páginas principais, sempre visível. Enquanto a nova Central de
 * Ajuda não existe, o "Fale conosco" é o caminho direto com a equipe — por isso ele vem primeiro e
 * em destaque.
 */
export function SuporteRodape() {
  const { t } = useIdioma();

  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-border px-4 py-8">
      <h2 className="text-sm font-bold text-muted-foreground">{t("rodape.precisaAjuda")}</h2>
      <nav aria-label={t("rodape.suporte")} className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <Link
          to="/fale-conosco"
          className="flex items-center gap-1.5 font-semibold text-primary underline-offset-2 hover:underline"
        >
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          {t("rodape.faleConosco")}
        </Link>
        <Link
          to="/configuracoes/acessibilidade"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Accessibility className="size-4 shrink-0" aria-hidden="true" />
          {t("rodape.acessibilidade")}
        </Link>
        <Link
          to="/configuracoes/privacidade"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t("rodape.privacidadeSeguranca")}
        </Link>
      </nav>
      {/* Os documentos ficam ao alcance depois do cadastro, e não só no aceite. */}
      <nav aria-label={t("rodape.documentosLegais")} className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link to="/termos" className="font-medium text-muted-foreground underline-offset-2 hover:underline">
          {t("rodape.termos")}
        </Link>
        <Link to="/privacidade" className="font-medium text-muted-foreground underline-offset-2 hover:underline">
          {t("rodape.privacidade")}
        </Link>
      </nav>
    </footer>
  );
}
