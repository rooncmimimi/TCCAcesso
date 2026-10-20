import { Link } from "@tanstack/react-router";
import { Accessibility, Lock, Mail, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n";

/**
 * Área de suporte no final das páginas principais, sempre visível. Enquanto a nova Central de
 * Ajuda não existe, o contato por e-mail é o caminho direto com a equipe — por isso ele vem
 * primeiro e em destaque.
 */
export function SuporteRodape() {
  const t = useT().layout.rodape;

  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-border px-4 py-8">
      <h2 className="text-sm font-bold text-muted-foreground">{t.ajuda}</h2>
      <nav aria-label={t.suporteAria} className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <a
          href="mailto:projetoacessoinclusivo@gmail.com"
          className="flex items-center gap-1.5 font-semibold text-primary underline-offset-2 hover:underline"
        >
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          {t.faleConosco}
        </a>
        <Link
          to="/configuracoes/acessibilidade"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Accessibility className="size-4 shrink-0" aria-hidden="true" />
          {t.acessibilidade}
        </Link>
        <Link
          to="/configuracoes/privacidade"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          {t.privacidade}
        </Link>
        <Link
          to="/configuracoes/seguranca"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          {t.seguranca}
        </Link>
      </nav>
    </footer>
  );
}
