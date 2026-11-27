import { Link } from "@tanstack/react-router";
import { Accessibility, HelpCircle, Lock, Mail } from "lucide-react";

import { useIdioma } from "@/hooks/useIdioma";

/**
 * Área de suporte no final das páginas principais, sempre visível: a Central de Ajuda (tutoriais) vem
 * primeiro, e o "Fale conosco" é o caminho direto com a equipe para o que os tutoriais não resolvem.
 */
export function SuporteRodape() {
  const { t } = useIdioma();

  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-border px-4 py-8">
      <h2 className="text-sm font-bold text-muted-foreground">{t("rodape.precisaAjuda")}</h2>
      <nav aria-label={t("rodape.suporte")} className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <Link
          to="/ajuda"
          className="flex min-h-6 items-center gap-1.5 font-semibold text-primary underline-offset-2 hover:underline"
        >
          <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
          {t("ajuda.link")}
        </Link>
        <Link
          to="/fale-conosco"
          className="flex min-h-6 items-center gap-1.5 font-semibold text-primary underline-offset-2 hover:underline"
        >
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          {t("rodape.faleConosco")}
        </Link>
        <Link
          to="/configuracoes/acessibilidade"
          className="flex min-h-6 items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Accessibility className="size-4 shrink-0" aria-hidden="true" />
          {t("rodape.acessibilidade")}
        </Link>
        <Link
          to="/configuracoes/privacidade"
          className="flex min-h-6 items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t("rodape.privacidadeSeguranca")}
        </Link>
      </nav>
      {/* Os documentos ficam ao alcance depois do cadastro, e não só no aceite. */}
      <nav aria-label={t("rodape.documentosLegais")} className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {/* Mesmos 24 px do critério 2.5.8; ver o rodapé da página inicial. */}
        <Link to="/termos" className="inline-flex min-h-6 items-center font-medium text-muted-foreground underline-offset-2 hover:underline">
          {t("rodape.termos")}
        </Link>
        <Link to="/privacidade" className="inline-flex min-h-6 items-center font-medium text-muted-foreground underline-offset-2 hover:underline">
          {t("rodape.privacidade")}
        </Link>
      </nav>
    </footer>
  );
}
