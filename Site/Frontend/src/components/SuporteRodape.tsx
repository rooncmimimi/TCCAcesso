import { Link } from "@tanstack/react-router";
import { Accessibility, Lock, Mail } from "lucide-react";

/**
 * Área de suporte no final das páginas principais, sempre visível. Enquanto a nova Central de
 * Ajuda não existe, o contato por e-mail é o caminho direto com a equipe — por isso ele vem
 * primeiro e em destaque.
 */
export function SuporteRodape() {
  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-border px-4 py-8">
      <h2 className="text-sm font-bold text-muted-foreground">Precisa de ajuda?</h2>
      <nav aria-label="Suporte" className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <a
          href="mailto:projetoacessoinclusivo@gmail.com"
          className="flex items-center gap-1.5 font-semibold text-primary underline-offset-2 hover:underline"
        >
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          Fale conosco
        </a>
        <Link
          to="/configuracoes/acessibilidade"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Accessibility className="size-4 shrink-0" aria-hidden="true" />
          Acessibilidade
        </Link>
        <Link
          to="/configuracoes/privacidade"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          Privacidade e Segurança
        </Link>
      </nav>
      {/* Os documentos ficam ao alcance depois do cadastro, e não só no aceite. */}
      <nav aria-label="Documentos legais" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link to="/termos" className="font-medium text-muted-foreground underline-offset-2 hover:underline">
          Termos de Uso
        </Link>
        <Link to="/privacidade" className="font-medium text-muted-foreground underline-offset-2 hover:underline">
          Aviso de Privacidade
        </Link>
      </nav>
    </footer>
  );
}
