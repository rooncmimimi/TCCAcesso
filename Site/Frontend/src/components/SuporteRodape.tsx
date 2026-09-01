import { Link } from "@tanstack/react-router";
import { Accessibility, HelpCircle, Lock, Mail, ShieldCheck } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";

/**
 * Área de suporte no final das páginas principais — sempre visível,
 * identifica o tipo de usuário logado para destacar a Central de Ajuda
 * certa primeiro, mas nunca esconde a outra (uma empresa pode querer ver
 * a central de candidato por curiosidade, e vice-versa).
 */
export function SuporteRodape() {
  const { user } = useSession();
  const ehEmpresa = user?.tipo === "empresa";

  const links = [
    {
      href: "/ajuda" as const,
      search: { central: "candidato" as const },
      label: "Central de Ajuda — Candidato",
      icon: HelpCircle,
      destaque: !ehEmpresa,
    },
    {
      href: "/ajuda" as const,
      search: { central: "empresa" as const },
      label: "Central de Ajuda — Empresa",
      icon: HelpCircle,
      destaque: ehEmpresa,
    },
  ];

  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-border px-4 py-8">
      <h2 className="text-sm font-bold text-muted-foreground">Precisa de ajuda?</h2>
      <nav aria-label="Suporte" className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            search={link.search}
            className={`flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline ${
              link.destaque ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <link.icon className="size-4 shrink-0" aria-hidden="true" />
            {link.label}
          </Link>
        ))}
        <a
          href="mailto:projetoacessoinclusivo@gmail.com"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
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
          Privacidade
        </Link>
        <Link
          to="/configuracoes/seguranca"
          className="flex items-center gap-1.5 font-semibold text-muted-foreground underline-offset-2 hover:underline"
        >
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          Segurança
        </Link>
      </nav>
    </footer>
  );
}
